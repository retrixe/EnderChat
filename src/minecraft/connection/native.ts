import {
  InteractionManager,
  NativeEventEmitter,
  NativeModules
} from 'react-native'
import events from 'events'
import {
  type ServerConnection,
  type ConnectionOptions,
  ConnectionState
} from '.'
import { type MinecraftChat } from '../chatToJsx'
import { concatPacketData, type Packet } from '../packet'
import { getLoginPacket, handleEncryptionRequest } from './shared'
import {
  readVarInt,
  writeVarInt,
  resolveHostname,
  protocolMap,
  parseChat
} from '../utils'
import packetIds from '../packets/ids'

const { ConnectionModule } = NativeModules

export const isNativeConnectionAvailable = (): boolean =>
  !!ConnectionModule?.openConnection

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
  on: ((event: 'connect', listener: () => void) => this) &
    ((event: 'packet', listener: (packet: Packet) => void) => this) &
    ((event: 'error', listener: (error: Error) => void) => this) &
    ((event: 'close', listener: () => void) => this) &
    ((event: string, listener: Function) => this) // eslint-disable-line @typescript-eslint/ban-types
}

export class NativeServerConnection
  extends events.EventEmitter
  implements ServerConnection
{
  eventEmitter = new NativeEventEmitter(ConnectionModule)
  state = ConnectionState.LOGIN
  closed = false
  id: string
  options: ConnectionOptions
  disconnectTimer?: NodeJS.Timeout
  disconnectReason?: MinecraftChat
  msgSalt?: Buffer

  constructor(id: string, options: ConnectionOptions) {
    super()
    this.id = id
    this.options = options
    this.eventEmitter.addListener(
      'ecm:log',
      ({ log }: NativeEvent & { log: string }) => console.log(log)
    )
    this.eventEmitter.addListener('ecm:connect', (event: NativeEvent) => {
      if (event.connectionId === this.id) this.emit('connect')
    })
    this.eventEmitter.addListener('ecm:packet', (event: NativePacketEvent) => {
      if (event.connectionId !== this.id) return
      // Run after interactions to improve user experience.
      InteractionManager.runAfterInteractions(() => {
        const packet: Packet = new Proxy(
          {
            id: event.id,
            data: event.data, // Buffer.from(event.data, 'base64'),
            idLength: event.idLength,
            dataLength: event.dataLength,
            packetLength: event.packetLength,
            lengthLength: event.lengthLength
          } as unknown as Packet,
          {
            get(target, p, receiver) {
              if (p === 'data' && typeof target.data === 'string') {
                target.data = Buffer.from(target.data, 'base64')
              }
              return Reflect.get(target, p, receiver)
            }
          }
        )

        // Internally handle login packets. We aren't handling these in native to share code.
        const { protocolVersion: version } = options
        // Set Compression and Keep Alive are handled in native for now.
        // When modifying this code, apply the same changes to the JavaScript back-end.
        if (
          packet.id === 0x02 /* Login Success */ &&
          this.state === ConnectionState.LOGIN
        ) {
          this.state =
            version >= protocolMap['1.20.2']
              ? ConnectionState.CONFIGURATION // Ack sent by native code
              : ConnectionState.PLAY
        } else if (
          packet.id === packetIds.CLIENTBOUND_FINISH_CONFIGURATION(version) &&
          this.state === ConnectionState.CONFIGURATION
        ) {
          this.state = ConnectionState.PLAY // Ack sent by native code
        } else if (
          packet.id === packetIds.CLIENTBOUND_START_CONFIGURATION(version) &&
          this.state === ConnectionState.PLAY
        ) {
          this.state = ConnectionState.CONFIGURATION // Ack sent by native code
        } else if (
          // Disconnect (login), Disconnect (configuration) or Disconnect (play)
          (packet.id === 0x00 && this.state === ConnectionState.LOGIN) ||
          (packet.id ===
            packetIds.CLIENTBOUND_DISCONNECT_CONFIGURATION(version) &&
            this.state === ConnectionState.CONFIGURATION) ||
          (packet.id === packetIds.CLIENTBOUND_DISCONNECT_PLAY(version) &&
            this.state === ConnectionState.PLAY)
        ) {
          this.disconnectReason = parseChat(
            packet.data, // The Disconnect (login) packet always returns JSON.
            this.state === ConnectionState.LOGIN ? undefined : version
          )[0]
        } else if (packet.id === 0x04 && this.state === ConnectionState.LOGIN) {
          /* Login Plugin Request */
          const [msgId] = readVarInt(packet.data)
          const rs = concatPacketData([writeVarInt(msgId), false])
          this.writePacket(0x02, rs).catch(err => this.emit('error', err))
        } else if (packet.id === 0x01 && this.state === ConnectionState.LOGIN) {
          /* Encryption Request */
          const { accessToken, selectedProfile } = options
          if (!accessToken || !selectedProfile) {
            this.disconnectReason =
              '{"text":"This server requires a premium account to be logged in!"}'
            this.close()
            return
          }
          handleEncryptionRequest(
            packet,
            accessToken,
            selectedProfile,
            this,
            async (secret: Buffer, response: Buffer) => {
              const eSecret = secret.toString('base64')
              const eResp = response.toString('base64')
              return ConnectionModule.enableEncryption(this.id, eSecret, eResp)
            }
          )
        }

        this.emit('packet', packet)
      }).then(() => {}, console.error)
    })
    this.eventEmitter.addListener('ecm:error', (event: NativeErrorEvent) => {
      if (event.connectionId !== this.id) return
      console.error(event.stackTrace)
      this.disconnectReason = event.message
      this.emit('error', new Error(event.message))
    })
    this.eventEmitter.addListener('ecm:close', (event: NativeEvent) => {
      if (event.connectionId !== this.id) return
      this.internalClose(false)
    })
  }

  async writePacket(packetId: number, data: Buffer): Promise<boolean> {
    const toWrite = data.toString('base64')
    return ConnectionModule.writePacket(this.id, packetId, toWrite)
  }

  internalClose(closeConnection: boolean): void {
    if (this.closed) return
    this.closed = true
    if (closeConnection) ConnectionModule.closeConnection(this.id)
    this.eventEmitter.removeAllListeners('ecm:connect')
    this.eventEmitter.removeAllListeners('ecm:packet')
    this.eventEmitter.removeAllListeners('ecm:error')
    this.eventEmitter.removeAllListeners('ecm:close')
    this.eventEmitter.removeAllListeners('ecm:log')
    this.emit('close')
  }

  close(): void {
    this.internalClose(true)
  }
}

const initiateNativeConnection = async (
  opts: ConnectionOptions
): Promise<NativeServerConnection> => {
  const [host, port] = await resolveHostname(opts.host, opts.port)
  const id = await ConnectionModule.openConnection({
    loginPacket: getLoginPacket(opts).toString('base64'),
    ...opts,
    host,
    port,
    packetFilter: Object.keys(packetIds)
      .filter(name => name.startsWith('CLIENTBOUND'))
      .map(name =>
        packetIds[name as keyof typeof packetIds](opts.protocolVersion)
      )
  })
  return new NativeServerConnection(id, opts)
}

export default initiateNativeConnection
