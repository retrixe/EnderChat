import type events from 'events'
import type { Packet } from '../packet'
import type { Certificate } from '../api/mojang'
import initiateJavaScriptConnection from './javascript'
import initiateNativeConnection, { isNativeConnectionAvailable } from './native'
import type { MinecraftChat } from '../chatToJsx'

export interface ConnectionOptions {
  serverName: string
  host: string
  port: number
  username: string
  protocolVersion: number
  selectedProfile?: string
  accessToken?: string
  certificate?: Certificate
}

export enum ConnectionState {
  LOGIN,
  CONFIGURATION,
  PLAY,
}

export interface ServerConnection extends events.EventEmitter {
  options: ConnectionOptions
  state: ConnectionState
  closed: boolean
  msgSalt?: Buffer
  disconnectReason?: MinecraftChat

  writePacket: (packetId: number, data: Buffer) => Promise<boolean>

  close: () => void

  on: ((event: 'connect', listener: () => void) => this) &
    ((event: 'packet', listener: (packet: Packet) => void) => this) &
    ((event: 'error', listener: (error: Error) => void) => this) &
    ((event: 'close', listener: () => void) => this) &
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    ((event: string, listener: Function) => this)
}

const initiateConnection = async (opts: ConnectionOptions): Promise<ServerConnection> => {
  if (isNativeConnectionAvailable()) {
    return await initiateNativeConnection(opts)
  }
  return await initiateJavaScriptConnection(opts)
}

export default initiateConnection
