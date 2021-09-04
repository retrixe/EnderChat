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
  socket: net.Socket
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
      ? await makeBaseCompressedPacket(
          this.compressionThreshold,
          packetId,
          data
        )
      : makeBasePacket(packetId, data)
    return this.socket.write(packet, cb)
  }
}

const initiateConnection = async (opts: {
  host: string
  port: number
  username: string
  protocolVersion: number
}) => {
  const [host, port] = await resolveHostname(opts.host, opts.port)
  return await new Promise<ServerConnection>((resolve, reject) => {
    const socket = net.createConnection({ host, port })
    const conn = new ServerConnection(socket)
    let resolved = false
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
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    socket.on('data', async newData => {
      // TODO: Online mode + Encryption + Time-out after 20s
      conn.bufferedData = Buffer.concat([conn.bufferedData, newData])
      while (true) {
        const packet = conn.compressionEnabled
          ? await parseCompressedPacket(conn.bufferedData)
          : parsePacket(conn.bufferedData)
        if (packet) {
          if (packet.id === 0x03 && !conn.loggedIn) {
            const [threshold] = readVarInt(packet.data)
            conn.compressionThreshold = threshold
            conn.compressionEnabled = threshold >= 0
          } else if (packet.id === 0x02 && !conn.loggedIn) {
            conn.loggedIn = true
          } else if (packet.id === 0x21) {
            console.log(
              'Received keep alive, is compressed? ' + conn.compressionEnabled
            )
            conn
              .writePacket(0x0f, packet.data)
              .catch(err => conn.emit('error', err))
          }
          conn.bufferedData = conn.bufferedData.slice(packet.packetLength)
          conn.emit('packet', packet)
        } else break
      }
      conn.emit('data', newData)
    })
    socket.on('close', () => conn.emit('close'))
    socket.on('error', err => {
      if (!resolved) reject(err)
      else conn.emit('error', err)
    })
  })
}

export default initiateConnection