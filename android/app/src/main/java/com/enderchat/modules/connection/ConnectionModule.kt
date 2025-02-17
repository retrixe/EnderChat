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
import java.util.concurrent.locks.ReentrantLock
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlin.concurrent.withLock

class ConnectionModule(reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {
    private val scope = CoroutineScope(SupervisorJob() +
            Dispatchers.IO +
            Dispatchers.Main +
            Dispatchers.Default)
    private val writeLock = ReentrantLock()
    private var socket: Socket? = null
    private var connectionId: UUID? = null
    private var packetIds: PacketIds? = null
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
        packetIds = null
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

    @ReactMethod fun writePacket(connId: String, packetId: Int, data: String, promise: Promise) {
        scope.launch(Dispatchers.IO) { writeLock.withLock {
            if (connId == connectionId.toString()) {
                try {
                    val dataBytes = Base64.decode(data, Base64.DEFAULT)
                    promise.resolve(directlyWritePacket(packetId, dataBytes))
                } catch (e: Exception) {
                    promise.reject(e)
                }
            } else promise.reject(Exception("This connection is closed!"))
        } }
    }

    @ReactMethod fun enableEncryption(
        connId: String, secret: String, packet: String, promise: Promise
    ) {
        scope.launch(Dispatchers.IO) { writeLock.withLock {
            if (connId == connectionId.toString()) {
                try {
                    val packetBytes = Base64.decode(packet, Base64.DEFAULT)
                    val secretBytes = Base64.decode(secret, Base64.DEFAULT)
                    val secretKey = SecretKeySpec(secretBytes, "AES")
                    val iv = IvParameterSpec(secretBytes)
                    aesDecipher = Cipher.getInstance("AES/CFB8/NoPadding").apply {
                        init(Cipher.DECRYPT_MODE, secretKey, iv)
                    }
                    val result = directlyWritePacket(packetIds!!.encryptionResponse, packetBytes)
                    aesCipher = Cipher.getInstance("AES/CFB8/NoPadding").apply {
                        init(Cipher.ENCRYPT_MODE, secretKey, iv)
                    }
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject(e)
                }
            } else promise.reject(Exception("This connection is closed!"))
        } }
    }

    @ReactMethod fun closeConnection(id: String) {
        scope.launch(Dispatchers.IO) { writeLock.withLock {
            if (id == connectionId.toString()) directlyCloseConnection()
        } }
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
        val ids = PacketIds(protocolVersion)
        // Receive packet IDs from JavaScript.
        opts.getMap("packetIds")?.let {
            for (entry in it.entryIterator) {
                val value = it.getDynamic(entry.key)
                if (value.type != ReadableType.Number) continue
                when (entry.key) {
                    "SERVERBOUND_LOGIN_START" -> ids.loginStart = value.asInt()
                    "SERVERBOUND_ENCRYPTION_RESPONSE" -> ids.encryptionResponse = value.asInt()
                    "CLIENTBOUND_LOGIN_SUCCESS" -> ids.loginSuccess = value.asInt()
                    "SERVERBOUND_LOGIN_ACKNOWLEDGED" -> ids.loginAcknowledged = value.asInt()
                    "CLIENTBOUND_SET_COMPRESSION" -> ids.setCompression = value.asInt()
                    "CLIENTBOUND_KEEP_ALIVE_CONFIGURATION" -> ids.configurationKeepAliveClientBound = value.asInt()
                    "SERVERBOUND_KEEP_ALIVE_CONFIGURATION" -> ids.configurationKeepAliveServerBound = value.asInt()
                    "CLIENTBOUND_FINISH_CONFIGURATION" -> ids.finishConfigurationClientBound = value.asInt()
                    "SERVERBOUND_ACK_FINISH_CONFIGURATION" -> ids.finishConfigurationServerBound = value.asInt()
                    "CLIENTBOUND_START_CONFIGURATION" -> ids.startConfigurationClientBound = value.asInt()
                    "SERVERBOUND_ACKNOWLEDGE_CONFIGURATION" -> ids.acknowledgeConfigurationServerBound = value.asInt()
                    "CLIENTBOUND_KEEP_ALIVE_PLAY" -> ids.playKeepAliveClientBound = value.asInt()
                    "SERVERBOUND_KEEP_ALIVE_PLAY" -> ids.playKeepAliveServerBound = value.asInt()
                }
            }
        }

        // Start thread which handles creating the connection and then reads packets from it.
        // This avoids blocking the main thread on writeLock and keeps the UI thread responsive.
        scope.launch(Dispatchers.IO) {
            val socket: Socket
            val connectionId = UUID.randomUUID()
            writeLock.withLock {
                try {
                    // Only one connection at a time.
                    directlyCloseConnection()

                    // Create socket and connection ID.
                    socket = Socket()
                    socket.soTimeout = 20 * 1000
                    this@ConnectionModule.socket = socket
                    this@ConnectionModule.connectionId = connectionId
                    this@ConnectionModule.packetIds = ids
                    promise.resolve(connectionId.toString())
                } catch (e: Exception) {
                    directlyCloseConnection()
                    promise.reject(e)
                    return@launch
                }
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
                val loginPacketData = Base64.decode(loginPacket, Base64.DEFAULT)

                writeLock.withLock { // Typically, we won't be writing packets atp, but just in case
                    // Initialise Handshake with server.
                    socket.getOutputStream().write(Packet(0x00, handshakeData.toByteArray()).writePacket())

                    // Send Login Start packet.
                    socket.getOutputStream().write(Packet(ids.loginStart, loginPacketData).writePacket())
                }
            } catch (e: Exception) {
                writeLock.withLock {
                    if (this@ConnectionModule.socket == socket) {
                        directlyCloseConnection()
                        sendErrorEvent(connectionId, e)
                    } else sendCloseEvent(connectionId)
                }
                return@launch
            }

            // Re-use the current thread, start reading from the socket.
            val buffer = ByteArrayOutputStream()
            val buf = ByteArray(4096)
            while (true) {
                var lockAcquired = false
                try {
                    val n = socket.getInputStream().read(buf)
                    if (n == -1) break

                    // Make sure this is the same socket we read from.
                    // TODO: We should move decryption/decompression out of this lock.
                    writeLock.lock()
                    lockAcquired = true
                    if (this@ConnectionModule.socket != socket) {
                        writeLock.unlock()
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
                        if (packet.id.value == ids.playKeepAliveClientBound && state == ConnectionState.PLAY) {
                            directlyWritePacket(ids.playKeepAliveServerBound, packet.data)
                        } else if (packet.id.value == ids.configurationKeepAliveClientBound &&
                            state == ConnectionState.CONFIGURATION) {
                            directlyWritePacket(ids.configurationKeepAliveServerBound, packet.data)
                        } else if (packet.id.value == ids.setCompression && state == ConnectionState.LOGIN) {
                            val threshold = VarInt.read(packet.data)?.value ?: 0
                            compressionThreshold = threshold
                            compressionEnabled = threshold >= 0
                        } else if (packet.id.value == ids.loginSuccess && state == ConnectionState.LOGIN) {
                            state = if (protocolVersion >= PROTOCOL_VERSION_1202) {
                                // directlyWritePacket(ids.loginAcknowledged, ByteArray(0))
                                ConnectionState.CONFIGURATION
                            } else ConnectionState.PLAY
                        } else if (packet.id.value == ids.finishConfigurationClientBound &&
                            state == ConnectionState.CONFIGURATION) {
                            state = ConnectionState.PLAY
                            // directlyWritePacket(ids.finishConfigurationServerBound, ByteArray(0))
                        } else if (packet.id.value == ids.startConfigurationClientBound &&
                            state == ConnectionState.PLAY) {
                            state = ConnectionState.CONFIGURATION
                            // directlyWritePacket(ids.acknowledgeConfigurationServerBound, ByteArray(0))
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
                    writeLock.unlock()
                    lockAcquired = false
                } catch (e: Exception) {
                    if (lockAcquired) writeLock.unlock()
                    writeLock.withLock { if (this@ConnectionModule.socket == socket) directlyCloseConnection() }
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

    private fun println(log: Any?) {
        sendEvent(reactContext = reactApplicationContext, "ecm:log", Arguments.createMap().apply {
            putString("log", log.toString())
        })
    }
}
