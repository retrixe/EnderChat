package com.enderchat.modules.connection

import android.os.Process
import android.util.Base64
import com.enderchat.modules.connection.datatypes.Packet
import com.enderchat.modules.connection.datatypes.VarInt
import com.enderchat.modules.connection.datatypes.writeString
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.io.ByteArrayOutputStream
import java.net.Socket
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.UUID
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.thread
import kotlin.concurrent.write

class ConnectionModule(reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {
    private val lock = ReentrantReadWriteLock()
    private var socket: Socket? = null
    private var connectionId: UUID? = null
    private var readThread: Thread? = null
    private var writeThread: Thread? = null
    private var compressionThreshold = -1
    private var compressionEnabled = false
    // TODO: AES ciphers for reading and writing.

    override fun getName() = "ConnectionModule"

    private fun directlyCloseConnection() {
        if (socket?.isClosed == false) socket!!.close() // We hold a lock lol
        socket = null
        readThread = null
        writeThread = null
        connectionId = null
        compressionThreshold = -1
        compressionEnabled = false
    }

    @ReactMethod fun closeConnection() = lock.write { directlyCloseConnection() }

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
            try {
                // Only one connection at a time.
                directlyCloseConnection()

                // Create socket, connection ID, read thread and write thread.
                socket = Socket(host, port)
                connectionId = UUID.randomUUID()
                readThread = Thread.currentThread()
                // TODO: What about the writeThread? Implement the ability to write from JS.

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
                promise.resolve(true)
            } catch (e: Exception) {
                directlyCloseConnection()
                lock.writeLock().unlock()
                promise.reject(e)
                return@thread
            }

            // TODO: Dispatch error events to JS when errors are encountered.
            // Re-use the current thread, start reading from the socket.
            val buffer = ByteArrayOutputStream()
            val buf = ByteArray(1024)
            while (lock.read { this.socket == socket }) {
                val n = socket.getInputStream().read(buf)
                if (n == -1)
                    break
                buffer.write(buf, 0, n)

                // Read packet.
                val bytes = buffer.toByteArray()
                val packet =
                    if (compressionEnabled) Packet.readCompressed(bytes) ?: continue
                    else Packet.read(bytes) ?: continue
                // Reset the buffer, we've been reading byte-by-byte so this is fine to do.
                buffer.reset()
                // We know packet.totalLength exists for read/readCompressed.
                buffer.write(bytes, packet.totalLength!!, bytes.size - packet.totalLength)

                // TODO: We can handle Keep Alive, Login Success and Set Compression.
                // TODO: Forward the rest to JavaScript. (Actually, forward Login Success too.)
            }
            buffer.close()
            // TODO: Dispatch close event to JS.
        }
    }
}
