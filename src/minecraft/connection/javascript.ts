import { InteractionManager } from 'react-native'
import Semaphore from 'semaphore-async-await'
import net from 'react-native-tcp'
import events from 'events'
import {
  Cipher,
  createCipheriv,
  createDecipheriv,
  createHash,
  Decipher,
  publicEncrypt
} from 'react-native-crypto'
import {
  concatPacketData,
  makeBaseCompressedPacket,
  makeBasePacket,
  Packet,
  PacketDataTypes,
  parseCompressedPacket,
  parsePacket
} from '../packet'
import {
  readVarInt,
  writeVarInt,
  resolveHostname,
  mcHexDigest,
  protocolMap,
  getRandomBytes
} from '../utils'
import { joinMinecraftSession } from '../api/mojang'
import { ServerConnection, ConnectionOptions } from '.'
import { getLoginPacket, parseEncryptionRequestPacket } from './shared'

export declare interface JavaScriptServerConnection {
  on: ((event: 'packet', listener: (packet: Packet) => void) => this) &
    ((event: 'error', listener: (error: Error) => void) => this) &
    ((event: 'data', listener: (data: Buffer) => void) => this) &
    ((event: 'close', listener: () => void) => this) &
    ((event: string, listener: Function) => this)
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
  msgSalt?: Buffer

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

const initiateJavaScriptConnection = async (opts: ConnectionOptions) => {
  const [host, port] = await resolveHostname(opts.host, opts.port)
  return await new Promise<ServerConnection>((resolve, reject) => {
    const socket = net.createConnection({ host, port })
    const conn = new JavaScriptServerConnection(socket, opts)
    let resolved = false
    const { accessToken, selectedProfile } = opts
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
        socket.write(makeBasePacket(0x00, getLoginPacket(opts)), () => {
          resolved = true
          resolve(conn)
        })
      )
    })
    socket.on('close', () => {
      conn.closed = true
      conn.emit('close')
    })
    socket.on('error', err => {
      if (!resolved) reject(err)
      else conn.emit('error', err)
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
              const is1164 =
                conn.options.protocolVersion >= protocolMap['1.16.4']
              const is117 = conn.options.protocolVersion >= protocolMap[1.17]
              const is119 = conn.options.protocolVersion >= protocolMap[1.19]
              const is1191 =
                conn.options.protocolVersion >= protocolMap['1.19.1']
              if (packet.id === 0x03 && !conn.loggedIn /* Set Compression */) {
                const [threshold] = readVarInt(packet.data)
                conn.compressionThreshold = threshold
                conn.compressionEnabled = threshold >= 0
              } else if (packet.id === 0x02 && !conn.loggedIn) {
                conn.loggedIn = true // Login Success
              } else if (
                // Keep Alive (clientbound)
                (packet.id === 0x1f && is1164 && !is117) ||
                (packet.id === 0x21 && is117 && !is119) ||
                (packet.id === 0x1e && is119 && !is1191) ||
                (packet.id === 0x20 && is1191)
              ) {
                const id = is1191 ? 0x12 : is119 ? 0x11 : is117 ? 0x0f : 0x10
                conn
                  .writePacket(id, packet.data)
                  .catch(err => conn.emit('error', err))
              } else if (
                // Disconnect (login) or Disconnect (play)
                (packet.id === 0x00 && !conn.loggedIn) ||
                (packet.id === 0x19 && conn.loggedIn && is1164 && !is117) ||
                (packet.id === 0x1a && conn.loggedIn && is117 && !is119) ||
                (packet.id === 0x17 && conn.loggedIn && is119 && !is1191) ||
                (packet.id === 0x19 && conn.loggedIn && is1191)
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
                // https://wiki.vg/Protocol_Encryption
                const [serverId, publicKey, verifyToken] =
                  parseEncryptionRequestPacket(packet)
                ;(async () => {
                  const secret = await getRandomBytes(16) // Generate random 16-byte shared secret.
                  // Generate hash.
                  const sha1 = createHash('sha1')
                  sha1.update(serverId) // ASCII encoding of the server id string from Encryption Request
                  sha1.update(secret)
                  sha1.update(publicKey) // Server's encoded public key from Encryption Request
                  const hash = mcHexDigest(sha1.digest())
                  // Send hash to Mojang servers.
                  const req = await joinMinecraftSession(
                    accessToken,
                    selectedProfile,
                    hash
                  )
                  if (!req.ok) {
                    throw new Error('Mojang online mode network request failed')
                  }
                  // Encrypt shared secret and verify token with public key.
                  const pk =
                    '-----BEGIN PUBLIC KEY-----\n' +
                    publicKey.toString('base64') +
                    '\n-----END PUBLIC KEY-----'
                  const ePrms = { key: pk, padding: 1 } // RSA_PKCS1_PADDING
                  const encryptedSharedSecret = publicEncrypt(ePrms, secret)
                  const encryptedVerifyToken = publicEncrypt(ePrms, verifyToken)
                  // Send encryption response packet.
                  // From this point forward, everything is encrypted, including the Login Success packet.
                  const response: PacketDataTypes[] = [
                    writeVarInt(encryptedSharedSecret.byteLength),
                    encryptedSharedSecret,
                    writeVarInt(encryptedVerifyToken.byteLength),
                    encryptedVerifyToken
                  ]
                  if (is119) {
                    conn.msgSalt = await getRandomBytes(8)
                    response.splice(2, 0, true)
                  }
                  const AES_ALG = 'aes-128-cfb8'
                  conn.aesDecipher = createDecipheriv(AES_ALG, secret, secret)
                  await conn.writePacket(0x01, concatPacketData(response))
                  conn.aesCipher = createCipheriv(AES_ALG, secret, secret)
                })().catch(e => {
                  console.error(e)
                  conn.disconnectReason =
                    '{"text":"Failed to authenticate with Mojang servers!"}'
                  conn.close()
                })
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
  })
}

export default initiateJavaScriptConnection
