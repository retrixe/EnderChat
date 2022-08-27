import { NativeModules } from 'react-native'
import net from 'react-native-tcp'
import events from 'events'
import { Cipher, Decipher } from 'react-native-crypto'
import { makeBaseCompressedPacket, makeBasePacket, Packet } from '../packet'
import { resolveHostname } from '../utils'
import { ConnectionOptions, ServerConnection } from '.'

const { ConnectionModule } = NativeModules

export const isNativeConnectionAvailable = () =>
  !!ConnectionModule?.thisWontWork

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

const initiateNativeConnection = async (opts: ConnectionOptions) => {
  const [host, port] = await resolveHostname(opts.host, opts.port)
  const connection = await ConnectionModule.initiateConnection({
    ...opts,
    host,
    port
  })
  return connection
}

export default initiateNativeConnection
