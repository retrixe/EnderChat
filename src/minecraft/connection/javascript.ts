import { InteractionManager } from 'react-native'
import Semaphore from 'semaphore-async-await'
import net from 'react-native-tcp'
import events from 'events'
import {
  type Cipher,
  createCipheriv,
  createDecipheriv,
  type Decipher
} from 'react-native-crypto'
import {
  concatPacketData,
  makeBaseCompressedPacket,
  makeBasePacket,
  type Packet,
  parseCompressedPacket,
  parsePacket
} from '../packet'
import { type ServerConnection, type ConnectionOptions } from '.'
import { getLoginPacket, handleEncryptionRequest } from './shared'
import { readVarInt, writeVarInt, resolveHostname } from '../utils'
import packetIds from '../packets/ids'

export declare interface JavaScriptServerConnection {
  on: ((event: 'packet', listener: (packet: Packet) => void) => this) &
    ((event: 'error', listener: (error: Error) => void) => this) &
    ((event: 'data', listener: (data: Buffer) => void) => this) &
    ((event: 'close', listener: () => void) => this) &
    ((event: string, listener: Function) => this) // eslint-disable-line @typescript-eslint/ban-types
}

/* eslint-disable @typescript-eslint/brace-style */
export class JavaScriptServerConnection
  extends events.EventEmitter
  implements ServerConnection
{
  /* eslint-enable @typescript-eslint/brace-style */
  bufferedData: Buffer = Buffer.from([])
  compressionThreshold = -1
  compressionEnabled = false
  loggedIn = false
  closed = false
  socket: net.Socket
  options: ConnectionOptions
  disconnectTimer?: NodeJS.Timeout
  disconnectReason?: string
  aesDecipher?: Decipher
  aesCipher?: Cipher

  constructor(socket: net.Socket, options: ConnectionOptions) {
    super()
    this.socket = socket
    this.options = options
  }

  async writePacket(
    packetId: number,
    data: Buffer,
    cb?: ((err?: Error | undefined) => void) | undefined
  ): Promise<boolean> {
    const compressionThreshold = this.compressionThreshold
    const packet = this.compressionEnabled
      ? await makeBaseCompressedPacket(compressionThreshold, packetId, data)
      : makeBasePacket(packetId, data)
    const toWrite = this.aesCipher ? this.aesCipher.update(packet) : packet
    return this.socket.write(toWrite, cb)
  }

  onlyOneCloseCall = false
  close(): void {
    if (this.onlyOneCloseCall) return
    else this.onlyOneCloseCall = true

    this.socket.end()
    setTimeout(() => {
      if (!this.closed) {
        this.closed = true
        this.socket.destroy()
      }
    }, 1000)
  }
}

const initiateJavaScriptConnection = async (
  opts: ConnectionOptions
): Promise<JavaScriptServerConnection> => {
  const [host, port] = await resolveHostname(opts.host, opts.port)
  const socket = net.createConnection({ host, port })
  const conn = new JavaScriptServerConnection(socket, opts)
  const { accessToken, selectedProfile } = opts
  socket.on('connect', () => {
    conn.emit('connect')
    // Create data to send in Handshake.
    const portBuf = Buffer.alloc(2)
    portBuf.writeUInt16BE(port)
    const handshakeData = [
      writeVarInt(opts.protocolVersion),
      host,
      portBuf,
      writeVarInt(2)
    ]
    // Initialise Handshake with server.
    socket.write(makeBasePacket(0x00, concatPacketData(handshakeData)), () =>
      // Send Login Start packet.
      socket.write(makeBasePacket(0x00, getLoginPacket(opts)))
    )
  })
  socket.on('close', () => {
    conn.closed = true
    conn.emit('close')
  })
  socket.on('error', err => {
    conn.disconnectReason = err.message
    conn.emit('error', err)
  })
  const lock = new Semaphore(1)
  socket.on('data', newData => {
    // Handle timeout after 20 seconds of no data.
    if (conn.disconnectTimer) clearTimeout(conn.disconnectTimer)
    conn.disconnectTimer = setTimeout(() => conn.close(), 20000)
    // Run after interactions to improve user experience.
    InteractionManager.runAfterInteractions(async () => {
      await lock.acquire()
      try {
        // Note: the entire packet is encrypted, including the length fields and the packet's data.
        // https://github.com/PrismarineJS/node-minecraft-protocol/blob/master/src/transforms/encryption.js
        let finalData = newData
        if (conn.aesDecipher) finalData = conn.aesDecipher.update(newData)
        // Buffer data for read.
        conn.bufferedData = Buffer.concat([conn.bufferedData, finalData])
        while (true) {
          const packet = conn.compressionEnabled
            ? await parseCompressedPacket(conn.bufferedData)
            : parsePacket(conn.bufferedData)
          if (packet) {
            // Remove packet from buffered data.
            conn.bufferedData =
              conn.bufferedData.length <= packet.packetLength
                ? Buffer.alloc(0) // Avoid errors shortening.
                : conn.bufferedData.slice(packet.packetLength)
            // Internally handle login packets.
            const { protocolVersion: version } = conn.options
            if (packet.id === 0x03 && !conn.loggedIn /* Set Compression */) {
              const [threshold] = readVarInt(packet.data)
              conn.compressionThreshold = threshold
              conn.compressionEnabled = threshold >= 0
            } else if (packet.id === 0x02 && !conn.loggedIn) {
              conn.loggedIn = true // Login Success
            } else if (
              packet.id === packetIds.CLIENTBOUND_KEEP_ALIVE(version)
            ) {
              const id = packetIds.SERVERBOUND_KEEP_ALIVE(version)
              conn
                .writePacket(id ?? 0, packet.data)
                .catch(err => conn.emit('error', err))
            } else if (
              // Disconnect (login) or Disconnect (play)
              (packet.id === 0x00 && !conn.loggedIn) ||
              (packet.id === packetIds.CLIENTBOUND_DISCONNECT_PLAY(version) &&
                conn.loggedIn)
            ) {
              const [chatLength, chatVarIntLength] = readVarInt(packet.data)
              conn.disconnectReason = packet.data
                .slice(chatVarIntLength, chatVarIntLength + chatLength)
                .toString('utf8')
            } else if (packet.id === 0x04 && !conn.loggedIn) {
              /* Login Plugin Request */
              const [msgId] = readVarInt(packet.data)
              const rs = concatPacketData([writeVarInt(msgId), false])
              conn.writePacket(0x02, rs).catch(err => conn.emit('error', err))
            } else if (packet.id === 0x01 && !conn.loggedIn) {
              /* Encryption Request */
              if (!accessToken || !selectedProfile) {
                conn.disconnectReason =
                  '{"text":"This server requires a premium account to be logged in!"}'
                conn.close()
                continue
              }
              handleEncryptionRequest(
                packet,
                accessToken,
                selectedProfile,
                conn,
                async (secret: Buffer, response: Buffer) => {
                  const AES_ALG = 'aes-128-cfb8'
                  conn.aesDecipher = createDecipheriv(AES_ALG, secret, secret)
                  await conn.writePacket(0x01, response)
                  conn.aesCipher = createCipheriv(AES_ALG, secret, secret)
                }
              )
            }
            conn.emit('packet', packet)
          } else break
        }
        conn.emit('data', newData)
      } catch (err) {
        conn.emit('error', err)
      }
      lock.release()
    }).then(() => {}, console.error)
  })
  return conn
}

export default initiateJavaScriptConnection
