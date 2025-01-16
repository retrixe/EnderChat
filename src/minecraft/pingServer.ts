import net from 'react-native-tcp'
import { Buffer } from 'buffer'

import {
  toggleEndian,
  padBufferToLength,
  resolveHostname,
  readVarInt,
  writeVarInt,
  protocolMap,
} from './utils'
import { makeBasePacket, concatPacketData, parsePacket, type Packet } from './packet'
import type { PlainTextChat } from './chatToJsx'

export interface LegacyPing {
  ff: number
  len: number
  motd: string
  ping: number
  online: number
  maxPlayers: number
  version: string
  protocol: number
}

export interface Ping {
  ping: number
  favicon: string
  version: { name: string; protocol: number }
  players: {
    max: number
    online: number
    sample: { name: string; id: string }[]
  }
  description: string | PlainTextChat
}

export const legacyPing = async (opts: { host: string; port: number }): Promise<LegacyPing> => {
  const [host, port] = await resolveHostname(opts.host, opts.port)
  return await new Promise<LegacyPing>((resolve, reject) => {
    const socket = net.createConnection({ host, port })
    let data = Buffer.from([])
    let time: number
    socket.on('connect', () => {
      // Initialise handshake with server.
      time = Date.now()
      socket.write(
        Buffer.from([
          0xfe, // FE — packet identifier for a server list ping
          0x01, // 01 — server list ping's payload (always 1)
          0xfa, // FA — packet identifier for a plugin message
          // 00 0B — length of following string, in characters, as a short (always 11)
          ...Buffer.from([0x00, 'MC|PingHost'.length]), // 16-bit BE number.
          // the string MC|PingHost encoded as a UTF - 16BE string
          // 00 4D 00 43 00 7C 00 50 00 69 00 6E 00 67 00 48 00 6F 00 73 00 74
          ...toggleEndian(Buffer.from('MC|PingHost', 'utf16le'), 2),
          // length of the rest of the data, as a short. Compute as 7 + len(hostname),
          // where len(hostname) is the number of bytes in the UTF-16BE encoded hostname.
          ...padBufferToLength(Buffer.from([host.length * 2 + 7]), 2),
          0x4a, // protocol version, e.g. 4a for the last version (74)
          // length of following string, in characters, as a short
          ...padBufferToLength(Buffer.from([host.length]), 2),
          // hostname the client is connecting to, encoded as a UTF-16BE string
          ...toggleEndian(Buffer.from(host, 'utf16le'), 2),
          // port the client is connecting to, as an int.
          ...padBufferToLength(Buffer.from(port.toString(16), 'hex'), 4),
        ]),
      )
    })
    socket.on('data', newData => {
      time = Date.now() - time
      data = Buffer.concat([data, newData])
    })
    socket.on('close', () => {
      try {
        const parts = toggleEndian(data.slice(3), 2).toString('utf16le').split('\u0000') // 0 index: §1.
        resolve({
          ff: data.readUInt8(0),
          len: data.readUInt16BE(1),
          protocol: +parts[1],
          version: parts[2],
          ping: time,
          motd: parts[3],
          online: +parts[4],
          maxPlayers: +parts[5],
        })
      } catch (e) {
        reject(e instanceof Error ? e : new Error(typeof e === 'string' ? e : undefined))
      }
    })
    socket.on('error', err => reject(err))
  })
}

export const modernPing = async (opts: { host: string; port: number }): Promise<Ping> => {
  const [host, port] = await resolveHostname(opts.host, opts.port)
  return await new Promise<Ping>((resolve, reject) => {
    const socket = net.createConnection({ host, port })
    let data = Buffer.from([])
    let timeSent: number
    let timeReceived: number
    const packets: Packet[] = []
    socket.on('connect', () => {
      // Create data to send in Handshake.
      const portBuf = Buffer.alloc(2)
      portBuf.writeUInt16BE(port)
      const handshakeData = [
        writeVarInt(protocolMap.latest), // It would be better to use -1, but some servers misbehave
        host,
        portBuf,
        writeVarInt(1),
      ]

      // Initialise Handshake with server.
      socket.write(makeBasePacket(0x00, concatPacketData(handshakeData)), () =>
        // Send Request packet.
        socket.write(makeBasePacket(0x00, Buffer.from([]))),
      )
    })
    socket.on('data', newData => {
      data = Buffer.concat([data, newData])
      // Parse the packets.
      let packet: Packet | undefined
      while ((packet = parsePacket(data))) {
        if (packet.id === 0x01) timeReceived = Date.now() // Special case for ping.
        data = data.slice(packet.packetLength)
        packets.push(packet)
      }
      // If Response packet has been received, send Ping packet.
      if (!timeSent && packets.find(p => p.id === 0x00)) {
        timeSent = Date.now()
        const timeLong = padBufferToLength(Buffer.from([timeSent]), 8)
        socket.write(makeBasePacket(0x01, timeLong))
      }
    })
    socket.on('close', () => {
      try {
        const responsePacket = packets.find(p => p.id === 0x00)
        if (!responsePacket) {
          return reject(new Error('No response packet was sent!'))
        }
        const [jsonLength, varIntLength] = readVarInt(responsePacket.data)
        const json = responsePacket.data
          .slice(varIntLength, varIntLength + jsonLength)
          .toString('utf8')
        const response = JSON.parse(json) as Ping

        resolve({
          ping: timeReceived - timeSent,
          version: response.version,
          players: response.players,
          favicon: response.favicon,
          description: response.description,
        })
      } catch (e) {
        reject(e instanceof Error ? e : new Error(typeof e === 'string' ? e : undefined))
      }
    })
    socket.on('error', err => reject(err))
  })
}
