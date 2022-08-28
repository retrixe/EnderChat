package com.enderchat.modules.connection

import android.os.Process
import android.util.Base64
import com.enderchat.modules.connection.datatypes.Packet
import com.enderchat.modules.connection.datatypes.VarInt
import com.enderchat.modules.connection.datatypes.writeString
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import java.io.ByteArrayOutputStream
import java.net.Socket
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.UUID
import java.util.concurrent.locks.ReentrantReadWriteLock
import javax.crypto.Cipher
import kotlin.concurrent.read
import kotlin.concurrent.thread
import kotlin.concurrent.write

class ConnectionModule(reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {
    private val lock = ReentrantReadWriteLock()
    private var socket: Socket? = null
    private var connectionId: UUID? = null
    private var compressionThreshold = -1
    private var compressionEnabled = false
    // TODO: Use AES ciphers for reading and writing. Maybe JS can initialise these? Or do we handle Encryption Request?
    private var aesDecipher: Cipher? = null
    private var aesCipher: Cipher? = null
    private var loggedIn = false

    override fun getName() = "ConnectionModule"

    private fun directlyCloseConnection() {
        try {
            if (socket?.isClosed == false) socket!!.close() // We hold a lock, this won't mutate.
        } catch (_: Exception) {}
        socket = null
        connectionId = null
        compressionThreshold = -1
        compressionEnabled = false
        aesDecipher = null
        aesCipher = null
        loggedIn = false
    }

    private fun directlyWriteToConnection(id: Int, data: ByteArray): Boolean {
        val packet = Packet(id, data)
        var asBytes =
            if (compressionEnabled) packet.writeCompressedPacket(compressionThreshold)
            else packet.writePacket()
        val socket = socket!!
        val socketIsOpen = !socket.isClosed && !socket.isOutputShutdown
        if (socketIsOpen) {
            if (aesCipher != null) {
                asBytes = aesCipher!!.update(asBytes)
            }
            socket.getOutputStream().write(asBytes)
        }
        return socketIsOpen
    }

    @ReactMethod fun writeToConnection(
        connId: String, packetId: Int, data: String, promise: Promise
    ) = runBlocking {
        launch(Dispatchers.Default) {
            lock.read {
                if (connId == connectionId.toString()) {
                    try {
                        val dataBytes = Base64.decode(data, Base64.DEFAULT)
                        promise.resolve(directlyWriteToConnection(packetId, dataBytes))
                    } catch (e: Exception) {
                        promise.reject(e)
                    }
                } else promise.resolve(false)
            }
        }
    }

    @ReactMethod fun closeConnection(id: String) = lock.write {
        if (id == connectionId.toString()) directlyCloseConnection()
    }

    @ReactMethod fun openConnection(opts: ReadableMap, promise: Promise) {
        val host = opts.getString("host")!!
        val port = opts.getDouble("port").toInt()
        // val username = opts.getString("username")!!
        val protocolVersion = opts.getDouble("protocolVersion").toInt()
        // val selectedProfile = opts.getString("selectedProfile")
        // val accessToken = opts.getString("accessToken")
        // val certificate = opts.getMap("certificate")
        val loginPacket = opts.getString("loginPacket")

        // Start thread which handles creating the connection and then reads packets from it.
        // This avoids blocking the main thread on writeLock and keeps the UI thread responsive.
        thread(start = true, name = "EnderChat-conn-read") {
            Process.setThreadPriority(Process.THREAD_PRIORITY_MORE_FAVORABLE)

            lock.writeLock().lock()
            val socket: Socket
            val connectionId = UUID.randomUUID()
            try {
                // Only one connection at a time.
                directlyCloseConnection()

                // Create socket and connection ID.
                socket = Socket(host, port)
                this.connectionId = UUID.randomUUID()

                // Create data to send in Handshake.
                val portBuf = ByteBuffer.allocate(2)
                portBuf.order(ByteOrder.BIG_ENDIAN)
                portBuf.putShort(port.toShort())
                val handshakeData = ByteArrayOutputStream()
                handshakeData.write(VarInt.write(protocolVersion).data)
                handshakeData.write(writeString(host))
                handshakeData.write(portBuf.array())
                handshakeData.write(VarInt.write(2).data)

                // Initialise Handshake with server.
                socket.getOutputStream().write(Packet(0x00, handshakeData.toByteArray()).writePacket())

                // Send Login Start packet.
                socket.getOutputStream().write(Base64.decode(loginPacket, Base64.DEFAULT))

                // Update the current socket and resolve/reject.
                this.socket = socket
                lock.writeLock().unlock()
                promise.resolve(connectionId.toString())
            } catch (e: Exception) {
                directlyCloseConnection()
                lock.writeLock().unlock()
                promise.reject(e)
                return@thread
            }

            // Calculate the necessary packet IDs.
            val is1164 = protocolVersion >= PROTOCOL_VERSION_1164
            val is117 = protocolVersion >= PROTOCOL_VERSION_117
            val is119 = protocolVersion >= PROTOCOL_VERSION_119
            val is1191 = protocolVersion >= PROTOCOL_VERSION_1191
            val keepAliveClientBoundId =
                if (is1191) 0x20
                else if (is119) 0x1e
                else if (is117) 0x21
                else if (is1164) 0x1f
                else 0x1f
            val keepAliveServerBoundId =
                if (is1191) 0x12
                else if (is119) 0x11
                else if (is117) 0x0f
                else if (is1164) 0x10
                else 0x10
            val loginSuccessId = 0x02
            val setCompressionId = 0x03

            // Re-use the current thread, start reading from the socket.
            val buffer = ByteArrayOutputStream()
            val buf = ByteArray(4096)
            var aesDecipher: Cipher?
            while (lock.read {
                    aesDecipher = this.aesDecipher
                    return@read this.socket == socket
            }) {
                try {
                    val n = socket.getInputStream().read(buf)
                    if (n == -1)
                        break

                    // Decrypt if necessary.
                    if (aesDecipher != null) {
                        buffer.write(aesDecipher!!.update(buf, 0, n))
                    } else {
                        buffer.write(buf, 0, n)
                    }

                    // Read packet.
                    val bytes = buffer.toByteArray()
                    val packet =
                        if (compressionEnabled) Packet.readCompressed(bytes) ?: continue
                        else Packet.read(bytes) ?: continue
                    // Reset the buffer, we've been reading byte-by-byte so this is fine to do.
                    buffer.reset() // We know packet.totalLength exists for read/readCompressed.
                    buffer.write(bytes, packet.totalLength!!, bytes.size - packet.totalLength)

                    // We can handle Keep Alive, Login Success and Set Compression.
                    // TODO: Maybe handle Keep Alive in JS. The overhead is minimal and would take away the disconnect timer from here.
                    if (packet.id.value == keepAliveClientBoundId) {
                        directlyWriteToConnection(keepAliveServerBoundId, packet.data)
                        continue
                    } else if (packet.id.value == setCompressionId && !loggedIn) {
                        val threshold = VarInt.read(packet.data)?.value ?: 0
                        compressionThreshold = threshold
                        compressionEnabled = threshold >= 0
                    } else if (packet.id.value == loginSuccessId && !loggedIn) {
                        loggedIn = true // Login Success
                    }

                    // Forward the packet to JavaScript.
                    val packetLengthLength =
                        packet.totalLength - packet.data.size - packet.id.data.size
                    val params = Arguments.createMap().apply {
                        putString("connectionId", connectionId.toString())
                        putDouble("id", packet.id.value.toDouble())
                        putString("data", Base64.encodeToString(packet.data, Base64.DEFAULT))
                        putBoolean("compressed", compressionEnabled)
                        putDouble("idLength", packet.id.data.size.toDouble())
                        putDouble("dataLength", packet.data.size.toDouble())
                        putDouble("packetLength", packet.totalLength.toDouble())
                        putDouble("lengthLength", packetLengthLength.toDouble())
                    }
                    sendEvent(reactContext = reactApplicationContext, "packet", params)
                } catch (e: Exception) {
                    lock.write { directlyCloseConnection() }
                    val params = Arguments.createMap().apply {
                        putString("connectionId", connectionId.toString())
                        putString("stackTrace", e.stackTraceToString())
                        putString("message", e.message)
                    }
                    sendEvent(reactContext = reactApplicationContext, "error", params)
                }
            }

            // Dispatch close event to JS.
            // The only way this.socket != socket is if directlyCloseConnection was called.
            // If isInputStream returns -1, for now we assume the socket was closed too.
            val params = Arguments.createMap().apply {
                putString("connectionId", connectionId.toString())
            }
            sendEvent(reactContext = reactApplicationContext, "close", params)
        }
    }

    private fun sendEvent(reactContext: ReactContext, eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod fun addListener(/* eventName: String */) {
        // Set up any upstream listeners or background tasks as necessary
    }

    @ReactMethod fun removeListeners(/* count: Int */) {
        // Remove upstream listeners, stop unnecessary background tasks
    }
}
