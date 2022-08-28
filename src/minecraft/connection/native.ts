import {
  InteractionManager,
  NativeEventEmitter,
  NativeModules
} from 'react-native'
import events from 'events'
import { createHash, publicEncrypt } from 'react-native-crypto'
import { concatPacketData, Packet, PacketDataTypes } from '../packet'
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

const { ConnectionModule } = NativeModules

export const isNativeConnectionAvailable = () =>
  !!ConnectionModule?.openConnection && false

interface NativeEvent {
  connectionId: string
}

interface NativePacketEvent extends NativeEvent, Omit<Packet, 'data'> {
  data: string
}

interface NativeErrorEvent extends NativeEvent {
  stackTrace: string
  message: string
}

export declare interface NativeServerConnection {
  on: ((event: 'packet', listener: (packet: Packet) => void) => this) &
    ((event: 'error', listener: (error: Error) => void) => this) &
    ((event: 'close', listener: () => void) => this) &
    ((event: string, listener: Function) => this)
}

/* eslint-disable @typescript-eslint/brace-style */
export class NativeServerConnection
  extends events.EventEmitter
  implements ServerConnection
{
  /* eslint-enable @typescript-eslint/brace-style */
  eventEmitter = new NativeEventEmitter(ConnectionModule)
  loggedIn = false
  closed = false
  id: string
  options: ConnectionOptions
  disconnectTimer?: NodeJS.Timeout
  disconnectReason?: string
  msgSalt?: Buffer

  constructor(id: string, options: ConnectionOptions) {
    super()
    this.id = id
    this.options = options
    this.eventEmitter.addListener('packet', (event: NativePacketEvent) => {
      console.log(event)
      if (event.connectionId !== this.id) return
      InteractionManager.runAfterInteractions(() => {
        const packet: Packet = {
          id: event.id,
          data: Buffer.from(event.data, 'base64'),
          idLength: event.idLength,
          dataLength: event.dataLength,
          packetLength: event.packetLength,
          lengthLength: event.lengthLength
        }

        // Internally handle login packets.
        // We aren't handling these in native for improved code sharing.
        // TODO: Actually share code with the JavaScript back-end.
        const is1164 = options.protocolVersion >= protocolMap['1.16.4']
        const is117 = options.protocolVersion >= protocolMap[1.17]
        const is119 = options.protocolVersion >= protocolMap[1.19]
        const is1191 = options.protocolVersion >= protocolMap['1.19.1']
        // Set Compression and Keep Alive are handled in native for now.
        if (packet.id === 0x02 && !this.loggedIn) {
          this.loggedIn = true // Login Success
        } else if (
          // Disconnect (login) or Disconnect (play)
          (packet.id === 0x00 && !this.loggedIn) ||
          (packet.id === 0x19 && this.loggedIn && is1164 && !is117) ||
          (packet.id === 0x1a && this.loggedIn && is117 && !is119) ||
          (packet.id === 0x17 && this.loggedIn && is119 && !is1191) ||
          (packet.id === 0x19 && this.loggedIn && is1191)
        ) {
          const [chatLength, chatVarIntLength] = readVarInt(packet.data)
          this.disconnectReason = packet.data
            .slice(chatVarIntLength, chatVarIntLength + chatLength)
            .toString('utf8')
        } else if (packet.id === 0x04 && !this.loggedIn) {
          /* Login Plugin Request */
          const [msgId] = readVarInt(packet.data)
          const rs = concatPacketData([writeVarInt(msgId), false])
          this.writePacket(0x02, rs).catch(err => this.emit('error', err))
        } else if (packet.id === 0x01 && !this.loggedIn) {
          /* Encryption Request */
          const { accessToken, selectedProfile } = options
          if (!accessToken || !selectedProfile) {
            this.disconnectReason =
              '{"text":"This server requires a premium account to be logged in!"}'
            this.close()
            return
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
              this.msgSalt = await getRandomBytes(8)
              response.splice(2, 0, true)
            }
            // const AES_ALG = 'aes-128-cfb8'
            // this.aesDecipher = createDecipheriv(AES_ALG, secret, secret)
            await this.writePacket(0x01, concatPacketData(response))
            // this.aesCipher = createCipheriv(AES_ALG, secret, secret)
          })().catch(e => {
            console.error(e)
            this.disconnectReason =
              '{"text":"Failed to authenticate with Mojang servers!"}'
            this.close()
          })
        }

        this.emit('packet', packet)
      }).then(() => {}, console.error)
    })
    this.eventEmitter.addListener('error', (event: NativeErrorEvent) => {
      console.log(event)
      if (event.connectionId !== this.id) return
      console.error(event.stackTrace)
      this.emit('error', new Error(event.message))
    })
    this.eventEmitter.addListener('close', (event: NativeEvent) => {
      console.log(event)
      if (event.connectionId !== this.id) return
      this.eventEmitter.removeAllListeners('packet')
      this.eventEmitter.removeAllListeners('error')
      this.eventEmitter.removeAllListeners('close')
      this.closed = true
      this.emit('close')
    })
  }

  async writePacket(packetId: number, data: Buffer): Promise<boolean> {
    const toWrite = data.toString('base64')
    return ConnectionModule.writePacket(this.id, packetId, toWrite)
  }

  close() {
    if (this.closed) return
    this.closed = true
    ConnectionModule.closeConnection(this.id)
    this.eventEmitter.removeAllListeners('packet')
    this.eventEmitter.removeAllListeners('error')
    this.eventEmitter.removeAllListeners('close')
  }
}

const initiateNativeConnection = async (opts: ConnectionOptions) => {
  const [host, port] = await resolveHostname(opts.host, opts.port)
  const id = await ConnectionModule.createConnection({
    loginPacket: getLoginPacket(opts).toString('base64'),
    ...opts,
    host,
    port
  })
  return new NativeServerConnection(id, opts)
}

export default initiateNativeConnection
