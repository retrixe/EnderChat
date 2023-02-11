import events from 'events'
import { Packet } from '../packet'
import { Certificate } from '../api/mojang'
import initiateJavaScriptConnection from './javascript'
import initiateNativeConnection, { isNativeConnectionAvailable } from './native'

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

export interface ServerConnection extends events.EventEmitter {
  options: ConnectionOptions
  loggedIn: boolean
  closed: boolean
  msgSalt?: Buffer
  disconnectReason?: string

  writePacket: (
    packetId: number,
    data: Buffer,
    cb?: ((err?: Error | undefined) => void) | undefined
  ) => Promise<boolean>

  close: () => void

  on: ((event: 'connect', listener: () => void) => this) &
    ((event: 'packet', listener: (packet: Packet) => void) => this) &
    ((event: 'error', listener: (error: Error) => void) => this) &
    ((event: 'close', listener: () => void) => this) &
    ((event: string, listener: Function) => this)
}

const initiateConnection = async (opts: ConnectionOptions) => {
  if (isNativeConnectionAvailable()) {
    return await initiateNativeConnection(opts)
  }
  return await initiateJavaScriptConnection(opts)
}

export default initiateConnection
