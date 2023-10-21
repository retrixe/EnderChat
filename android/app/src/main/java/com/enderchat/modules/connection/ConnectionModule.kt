package com.enderchat.modules.connection

import android.util.Base64
import com.enderchat.modules.connection.datatypes.Packet
import com.enderchat.modules.connection.datatypes.VarInt
import com.enderchat.modules.connection.datatypes.writeString
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import java.io.ByteArrayOutputStream
import java.net.Socket
import java.net.InetSocketAddress
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.UUID
import java.util.concurrent.locks.ReentrantReadWriteLock
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlin.concurrent.read
import kotlin.concurrent.write

class ConnectionModule(reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {
    private val scope = CoroutineScope(SupervisorJob() +
            Dispatchers.IO +
            Dispatchers.Main +
            Dispatchers.Default)
    private val lock = ReentrantReadWriteLock()
    private var socket: Socket? = null
    private var connectionId: UUID? = null
    private var compressionThreshold = -1
    private var compressionEnabled = false
    private var aesDecipher: Cipher? = null
    private var aesCipher: Cipher? = null
    private var state = ConnectionState.LOGIN

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
        state = ConnectionState.LOGIN
    }

    private fun directlyWritePacket(id: Int, data: ByteArray): Boolean {
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

    @ReactMethod fun writePacket(
        connId: String, packetId: Int, data: String, promise: Promise
    ) = scope.launch(Dispatchers.IO) {
        lock.read {
            if (connId == connectionId.toString()) {
                try {
                    val dataBytes = Base64.decode(data, Base64.DEFAULT)
                    promise.resolve(directlyWritePacket(packetId, dataBytes))
                } catch (e: Exception) {
                    promise.reject(e)
                }
            } else promise.reject(Exception("This connection is closed!"))
        }
    }

    @ReactMethod fun enableEncryption(
        connId: String, secret: String, packet: String, promise: Promise
    ) = scope.launch(Dispatchers.IO) {
        lock.write {
            if (connId == connectionId.toString()) {
                try {
                    val packetBytes = Base64.decode(packet, Base64.DEFAULT)
                    val secretBytes = Base64.decode(secret, Base64.DEFAULT)
                    val secretKey = SecretKeySpec(secretBytes, "AES")
                    val iv = IvParameterSpec(secretBytes)
                    aesDecipher = Cipher.getInstance("AES/CFB8/NoPadding").apply {
                        init(Cipher.DECRYPT_MODE, secretKey, iv)
                    }
                    val result = directlyWritePacket(0x01, packetBytes)
                    aesCipher = Cipher.getInstance("AES/CFB8/NoPadding").apply {
                        init(Cipher.ENCRYPT_MODE, secretKey, iv)
                    }
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject(e)
                }
            } else promise.reject(Exception("This connection is closed!"))
        }
    }

    @ReactMethod fun closeConnection(id: String) = scope.launch(Dispatchers.IO) {
        lock.write {
            if (id == connectionId.toString()) directlyCloseConnection()
        }
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
        val packetFilter = opts.getArray("packetFilter")?.let {
            val hashSet = hashSetOf<Int>()
            for (i in 0 until it.size()) {
                val value = it.getDynamic(i)
                if (value.type == ReadableType.Number) hashSet.add(value.asInt())
            }
            hashSet
        }

        // Start thread which handles creating the connection and then reads packets from it.
        // This avoids blocking the main thread on writeLock and keeps the UI thread responsive.
        scope.launch(Dispatchers.IO) {
            val socket: Socket
            val connectionId = UUID.randomUUID()
            try {
                lock.write {
                    // Only one connection at a time.
                    directlyCloseConnection()

                    // Create socket and connection ID.
                    socket = Socket()
                    socket.soTimeout = 20 * 1000
                    this@ConnectionModule.socket = socket
                    this@ConnectionModule.connectionId = connectionId
                    promise.resolve(connectionId.toString())
                }
            } catch (e: Exception) {
                directlyCloseConnection()
                promise.reject(e)
                return@launch
            }

            try {
                // Connect to the server.
                socket.connect(InetSocketAddress(host, port), 30 * 1000)

                // Send connect event.
                val params = Arguments.createMap().apply {
                    putString("connectionId", connectionId.toString())
                }
                sendEvent(reactContext = reactApplicationContext, "ecm:connect", params)

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
                val loginPacketData = Base64.decode(loginPacket, Base64.DEFAULT)
                socket.getOutputStream().write(Packet(0x00, loginPacketData).writePacket())
            } catch (e: Exception) {
                lock.write {
                    if (this@ConnectionModule.socket == socket) {
                        directlyCloseConnection()
                        sendErrorEvent(connectionId, e)
                    } else sendCloseEvent(connectionId)
                }
                return@launch
            }

            // Calculate the necessary packet IDs.
            val is1164 = protocolVersion >= PROTOCOL_VERSION_1164
            val is117 = protocolVersion >= PROTOCOL_VERSION_117
            val is119 = protocolVersion >= PROTOCOL_VERSION_119
            val is1191 = protocolVersion >= PROTOCOL_VERSION_1191
            val is1193 = protocolVersion >= PROTOCOL_VERSION_1193
            val is1194 = protocolVersion >= PROTOCOL_VERSION_1194
            val is1202 = protocolVersion >= PROTOCOL_VERSION_1202
            // Login state packet IDs
            val loginSuccessId = 0x02
            val loginAcknowledgedId = 0x03
            val setCompressionId = 0x03
            // Configuration state packet IDs
            val configurationKeepAliveClientBoundId = 0x03
            val configurationKeepAliveServerBoundId = 0x03
            val finishConfigurationClientBoundId = 0x02
            val finishConfigurationServerBoundId = 0x02
            // Play state packet IDs
            val startConfigurationClientBoundId =
                if (is1202) 0x65
                else -1
            val configurationAcknowledgedServerBoundId =
                if (is1202) 0x0b
                else -1
            val playKeepAliveClientBoundId =
                if (is1202) 0x24
                else if (is1194) 0x23
                else if (is1193) 0x1f
                else if (is1191) 0x20
                else if (is119) 0x1e
                else if (is117) 0x21
                else if (is1164) 0x1f
                else -1
            val playKeepAliveServerBoundId =
                if (is1202) 0x14
                else if (is1194) 0x12
                else if (is1193) 0x11
                else if (is1191) 0x12
                else if (is119) 0x11
                else if (is117) 0x0f
                else if (is1164) 0x10
                else -1

            // Re-use the current thread, start reading from the socket.
            val buffer = ByteArrayOutputStream()
            val buf = ByteArray(4096)
            while (true) {
                var lockAcquired = false
                try {
                    val n = socket.getInputStream().read(buf)
                    if (n == -1) break

                    // Make sure this is the same socket we read from.
                    lock.readLock().lock()
                    lockAcquired = true
                    if (this@ConnectionModule.socket != socket) {
                        lock.readLock().unlock()
                        break
                    }

                    // Decrypt if necessary.
                    if (aesDecipher != null) {
                        buffer.write(aesDecipher!!.update(buf, 0, n))
                    } else {
                        buffer.write(buf, 0, n)
                    }

                    while (true) {
                        // Read packets from the buffer.
                        val bytes = buffer.toByteArray()
                        val packet =
                            if (compressionEnabled) Packet.readCompressed(bytes) ?: break
                            else Packet.read(bytes) ?: break
                        // Reset the buffer, we've been reading byte-by-byte so this is fine to do.
                        buffer.reset() // We know packet.totalLength exists for read/readCompressed.
                        buffer.write(bytes, packet.totalLength!!, bytes.size - packet.totalLength)

                        // We handle Keep Alive (both play and configuration), Login Success, Set Compression
                        // and Start/Finish Configuration state changes.
                        // FIXME: I feel this is incorrect logic and writePacket should also have a write lock?
                        // No write lock since writePacket isn't called during login/config sequence (usually).
                        if (packet.id.value == playKeepAliveClientBoundId && state == ConnectionState.PLAY) {
                            directlyWritePacket(playKeepAliveServerBoundId, packet.data)
                        } else if (packet.id.value == configurationKeepAliveClientBoundId &&
                            state == ConnectionState.CONFIGURATION) {
                            directlyWritePacket(configurationKeepAliveServerBoundId, packet.data)
                        } else if (packet.id.value == setCompressionId && state == ConnectionState.LOGIN) {
                            val threshold = VarInt.read(packet.data)?.value ?: 0
                            compressionThreshold = threshold
                            compressionEnabled = threshold >= 0
                        } else if (packet.id.value == loginSuccessId && state == ConnectionState.LOGIN) {
                            state = if (is1202) {
                                directlyWritePacket(loginAcknowledgedId, ByteArray(0))
                                ConnectionState.CONFIGURATION
                            } else ConnectionState.PLAY
                        } else if (packet.id.value == finishConfigurationClientBoundId &&
                            state == ConnectionState.CONFIGURATION) {
                            state = ConnectionState.PLAY
                            directlyWritePacket(finishConfigurationServerBoundId, ByteArray(0))
                        } else if (packet.id.value == startConfigurationClientBoundId &&
                            state == ConnectionState.PLAY) {
                            state = ConnectionState.CONFIGURATION
                            directlyWritePacket(configurationAcknowledgedServerBoundId, ByteArray(0))
                        }

                        // Forward the packet to JavaScript.
                        if (packetFilter?.contains(packet.id.value) != false) {
                            val packetLengthLength =
                                packet.totalLength - (packet.data.size + packet.id.data.size)
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
                            sendEvent(reactContext = reactApplicationContext, "ecm:packet", params)
                        }
                    }
                    lock.readLock().unlock()
                    lockAcquired = false
                } catch (e: Exception) {
                    if (lockAcquired) lock.readLock().unlock()
                    lock.write { if (this@ConnectionModule.socket == socket) directlyCloseConnection() }
                    sendErrorEvent(connectionId, e)
                    break
                }
            }

            // Dispatch close event to JS.
            // The only way this.socket != socket is if directlyCloseConnection was called.
            // If isInputStream returns -1, for now we assume the socket was closed too.
            sendCloseEvent(connectionId)
        }
    }

    private fun sendErrorEvent(connectionId: UUID, e: Exception) {
        val params = Arguments.createMap().apply {
            putString("connectionId", connectionId.toString())
            putString("stackTrace", e.stackTraceToString())
            putString("message", e.message)
        }
        sendEvent(reactContext = reactApplicationContext, "ecm:error", params)
    }

    private fun sendCloseEvent(connectionId: UUID) {
        val params = Arguments.createMap().apply {
            putString("connectionId", connectionId.toString())
        }
        sendEvent(reactContext = reactApplicationContext, "ecm:close", params)
    }

    private fun sendEvent(reactContext: ReactContext, eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    @Suppress("UNUSED_PARAMETER")
    fun addListener(eventName: String) {
        // Set up any upstream listeners or background tasks as necessary
    }

    @ReactMethod
    @Suppress("UNUSED_PARAMETER")
    fun removeListeners(count: Int) {
        // Remove upstream listeners, stop unnecessary background tasks
    }

    /* private fun println(log: Any?) {
        sendEvent(reactContext = reactApplicationContext, "ecm:log", Arguments.createMap().apply {
            putString("log", log.toString())
        })
    } */
}
