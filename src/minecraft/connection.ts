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
} from './packet'
import {
  readVarInt,
  writeVarInt,
  resolveHostname,
  generateSharedSecret,
  mcHexDigest,
  protocolMap
} from './utils'
import { Certificate, joinMinecraftSession } from './api/mojang'

export interface ConnectionOptions {
  host: string
  port: number
  username: string
  protocolVersion: number
  selectedProfile?: string
  accessToken?: string
  certificate?: Certificate
}

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

const getLoginPacket = (opts: ConnectionOptions) => {
  const data: PacketDataTypes[] = [opts.username]
  if (opts.protocolVersion >= protocolMap[1.19]) {
    data.push(!!opts.certificate)
    if (opts.certificate) {
      let buf = Buffer.alloc(8)
      buf.writeBigInt64BE(
        BigInt(new Date(opts.certificate.expiresAt).getTime())
      )
      data.push(buf)
      const publicKeyBase64Data = opts.certificate.keyPair.publicKey
        .replace(/\n/g, '')
        .replace('-----BEGIN RSA PUBLIC KEY-----', '')
        .replace('-----END RSA PUBLIC KEY-----', '')
        .trim()
      buf = Buffer.from(publicKeyBase64Data, 'base64')
      data.push(writeVarInt(buf.byteLength))
      data.push(buf)
      buf = Buffer.from(opts.certificate.publicKeySignature, 'base64')
      data.push(writeVarInt(buf.byteLength))
      data.push(buf)
    }
  }
  return concatPacketData(data)
}

const initiateConnection = async (opts: ConnectionOptions) => {
  const [host, port] = await resolveHostname(opts.host, opts.port)
  return await new Promise<ServerConnection>((resolve, reject) => {
    const socket = net.createConnection({ host, port })
    const conn = new ServerConnection(socket, opts)
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
                (packet.id === 0x1a &&
                  conn.loggedIn &&
                  opts.protocolVersion < protocolMap[1.19]) ||
                (packet.id === 0x17 &&
                  conn.loggedIn &&
                  opts.protocolVersion >= protocolMap[1.19])
              ) {
                const [chatLength, chatVarIntLength] = readVarInt(packet.data)
                conn.disconnectReason = packet.data
                  .slice(chatVarIntLength, chatVarIntLength + chatLength)
                  .toString('utf8')
              } else if (packet.id === 0x01 && !conn.loggedIn && !accessToken) {
                conn.disconnectReason =
                  '{"text":"This server requires a premium account to be logged in!"}'
                conn.close()
              } else if (packet.id === 0x01 && !conn.loggedIn) {
                // https://wiki.vg/Protocol_Encryption
                const [serverId, publicKey, verifyToken] =
                  parseEncryptionRequestPacket(packet)
                ;(async () => {
                  const secret = await generateSharedSecret() // Generate random 16-byte shared secret.
                  // Generate hash.
                  const sha1 = createHash('sha1')
                  sha1.update(serverId) // ASCII encoding of the server id string from Encryption Request
                  sha1.update(secret)
                  sha1.update(publicKey) // Server's encoded public key from Encryption Request
                  const hash = mcHexDigest(sha1.digest())
                  // Send hash to Mojang servers.
                  const req = await joinMinecraftSession(
                    accessToken as string,
                    selectedProfile as string,
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
                  if (opts.protocolVersion >= protocolMap[1.19]) {
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

export default initiateConnection

const parseEncryptionRequestPacket = (packet: Packet) => {
  // ASCII encoding of the server id string
  let data = packet.data
  const [sidLen, sidLenLen] = readVarInt(data)
  const serverId = data.slice(sidLenLen, sidLenLen + sidLen)
  // Server's encoded public key
  data = data.slice(sidLen + sidLenLen)
  const [pkLen, pkLenLen] = readVarInt(data)
  const publicKey = data.slice(pkLenLen, pkLen + pkLenLen)
  // Server's randomly generated verify token
  data = data.slice(pkLen + pkLenLen)
  const [vtLen, vtLenLen] = readVarInt(data)
  const verifyToken = data.slice(vtLenLen, vtLenLen + vtLen)

  return [serverId, publicKey, verifyToken]
}
