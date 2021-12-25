// import { createHash } from 'react-native-crypto'
import { InteractionManager } from 'react-native'
import net from 'react-native-tcp'
import events from 'events'
import {
  concatPacketData,
  makeBaseCompressedPacket,
  makeBasePacket,
  Packet,
  parseCompressedPacket,
  parsePacket
} from './packet'
import { resolveHostname } from './utils'
import { readVarInt, writeVarInt } from './packetUtils'
// import { authUrl, generateSharedSecret, mcHexDigest } from './onlineMode'

export declare interface ServerConnection {
  on: ((event: 'packet', listener: (packet: Packet) => void) => this) &
    ((event: 'error', listener: (error: Error) => void) => this) &
    ((event: 'data', listener: (data: Buffer) => void) => this) &
    ((event: 'close', listener: () => void) => this) &
    ((event: string, listener: Function) => this)
}

export class ServerConnection extends events.EventEmitter {
  bufferedData: Buffer = Buffer.from([])
  compressionThreshold = -1
  compressionEnabled = false
  loggedIn = false
  closed = false
  socket: net.Socket
  disconnectTimer?: NodeJS.Timeout
  disconnectReason?: string

  constructor(socket: net.Socket) {
    super()
    this.socket = socket
  }

  async writePacket(
    packetId: number,
    data: Buffer,
    cb?: ((err?: Error | undefined) => void) | undefined
  ): Promise<boolean> {
    const packet = this.compressionEnabled
      ? makeBaseCompressedPacket(this.compressionThreshold, packetId, data)
      : makeBasePacket(packetId, data)
    return this.socket.write(packet, cb)
  }

  onlyOneCloseCall = false
  close() {
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

const initiateConnection = async (opts: {
  host: string
  port: number
  username: string
  protocolVersion: number
  selectedProfile?: string
  accessToken?: string
}) => {
  const [host, port] = await resolveHostname(opts.host, opts.port)
  return await new Promise<ServerConnection>((resolve, reject) => {
    const socket = net.createConnection({ host, port })
    const conn = new ServerConnection(socket)
    let resolved = false
    const { accessToken /* , selectedProfile */ } = opts
    socket.on('connect', () => {
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
        socket.write(
          makeBasePacket(0x00, concatPacketData([opts.username])),
          () => {
            resolved = true
            resolve(conn)
          }
        )
      )
    })
    socket.on('data', newData => {
      // Handle timeout after 20 seconds of no data.
      if (conn.disconnectTimer) clearTimeout(conn.disconnectTimer)
      conn.disconnectTimer = setTimeout(() => conn.close(), 20000)
      // Run after interactions to improve user experience.
      InteractionManager.runAfterInteractions(() => {
        // Buffer data for read.
        // TODO: Implement decryption.
        conn.bufferedData = Buffer.concat([conn.bufferedData, newData])
        // ;(async () => { This would need a mutex.
        while (true) {
          const packet = conn.compressionEnabled
            ? parseCompressedPacket(conn.bufferedData)
            : parsePacket(conn.bufferedData)
          if (packet) {
            if (packet.id === 0x03 && !conn.loggedIn) {
              const [threshold] = readVarInt(packet.data)
              conn.compressionThreshold = threshold
              conn.compressionEnabled = threshold >= 0
            } else if (packet.id === 0x02 && !conn.loggedIn) {
              conn.loggedIn = true
            } else if (packet.id === 0x21) {
              conn
                .writePacket(0x0f, packet.data)
                .catch(err => conn.emit('error', err))
            } else if (
              (packet.id === 0x00 && !conn.loggedIn) ||
              (packet.id === 0x1a && conn.loggedIn)
            ) {
              const [chatLength, chatVarIntLength] = readVarInt(packet.data)
              conn.disconnectReason = packet.data
                .slice(chatVarIntLength, chatVarIntLength + chatLength)
                .toString('utf8')
            } else if (packet.id === 0x01 && !conn.loggedIn && !accessToken) {
              conn.disconnectReason =
                'This server requires a premium account to be logged in!'
              conn.close()
            } /* else if (packet.id === 0x01 && !conn.loggedIn) {
              const [serverIdLen, serverIdLenLen] = readVarInt(packet.data)
              const serverId = packet.data.slice(
                serverIdLenLen,
                serverIdLen + serverIdLenLen
              )
              const data = packet.data.slice(serverIdLen + serverIdLenLen)
              const [pkLen, pkLenLen] = readVarInt(data)
              const publicKey = data.slice(pkLenLen, pkLen + pkLenLen)
              const verifyTokenData = data.slice(pkLen + pkLenLen)
              const [, verifyTokenLengthLength] = readVarInt(verifyTokenData)
              const verifyToken = verifyTokenData.slice(verifyTokenLengthLength)
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              ;(async () => {
                // Generate random 16-byte shared secret.
                const sharedSecret = await generateSharedSecret()
                // Generate hash.
                const sha1 = createHash('sha1')
                sha1.update(serverId) // ASCII encoding of the server id string from Encryption Request
                sha1.update(sharedSecret)
                sha1.update(publicKey) // Server's encoded public key from Encryption Request
                const hash = mcHexDigest(sha1.digest())
                // Send hash to Mojang servers.
                const body = JSON.stringify({
                  accessToken,
                  selectedProfile,
                  serverId: hash
                })
                const req = await fetch(authUrl, { method: 'POST', body })
                // TODO: https://wiki.vg/Protocol_Encryption
                // Encrypt shared secret and verify token with public key.
                // Send encryption response packet.
                // Encrypted Shared Secret Length - VarInt
                // Encrypted Shared Secret - Byte Array
                // Encrypted Verify Token Length - VarInt
                // Encrypted Verify Token - Byte Array
                // It then sends a Login Success, and enables AES/CFB8 encryption.
                // For the Initial Vector (IV) and AES setup, both sides use the shared
                // secret as both the IV and the key. Similarly, the client will also
                // enable encryption upon sending Encryption Response.
                // From this point forward, everything is encrypted.
                // Note: the entire packet is encrypted, including the length
                // fields and the packet's data.
                // The Login Success packet is sent encrypted.
              })()
            } */
            conn.bufferedData =
              conn.bufferedData.length <= packet.packetLength
                ? Buffer.alloc(0) // Avoid errors shortening.
                : conn.bufferedData.slice(packet.packetLength)
            conn.emit('packet', packet)
          } else break
        }
        conn.emit('data', newData)
      }).then(() => {}, console.error)
    })
    socket.on('close', () => {
      conn.closed = true
      conn.emit('close')
    })
    socket.on('error', err => {
      if (!resolved) reject(err)
      else conn.emit('error', err)
    })
  })
}

export default initiateConnection
