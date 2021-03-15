import zlib from 'zlib'
import { Buffer } from 'buffer'
import { readVarInt, writeVarInt } from './packetDataTypes'
import { toggleEndian } from './utils'

export const makeBasePacket = (packetId: number, data: Buffer) => {
  const finalData = Buffer.concat([writeVarInt(packetId), data])
  const finalDataLength = writeVarInt(finalData.byteLength)
  // VarInt Length(Packet ID + Data) + VarInt Packet ID + Byte Array Data
  return Buffer.concat([finalDataLength, finalData])
}

export const makeBaseCompressedPacket = async (
  packetId: number,
  data: Buffer
) => {
  const finalData = Buffer.concat([writeVarInt(packetId), data])
  const finalDataLength = writeVarInt(finalData.byteLength)
  const compressedData: Buffer = await new Promise((resolve, reject) => {
    zlib.deflate(finalData, (err, res) => (err ? reject(err) : resolve(res)))
  })
  const finalPacket = Buffer.concat([finalDataLength, compressedData])
  // VarInt Packet Length | Length of Data Length + compressed length of (Packet ID + Data)
  // VarInt Data Length   | Length of uncompressed (Packet ID + Data) or 0
  // VarInt Packet ID     | zlib compressed packet ID (see the sections below)
  // Byte Array Data      | zlib compressed packet data (see the sections below)
  return Buffer.concat([writeVarInt(finalPacket.byteLength), finalPacket])
}

export type PacketDataTypes = string | boolean | number | Buffer

export const concatPacketData = (data: PacketDataTypes[]) =>
  Buffer.concat(
    data.map(field => {
      if (typeof field === 'string') {
        const encoded = Buffer.from(field, 'utf8')
        return Buffer.concat([writeVarInt(encoded.byteLength), encoded])
      } else if (typeof field === 'boolean') {
        return Buffer.from([field ? 0x01 : 0x00])
      } else if (Buffer.isBuffer(field)) return field
      else return toggleEndian(Buffer.from([field]))
    })
  )

export interface Packet {
  id: number
  data: Buffer
  packetLength: number
}

export const parsePacket = (packet: Buffer): Packet | undefined => {
  if (packet.byteLength === 0) return
  const [packetBodyLength, varIntLength] = readVarInt(packet)
  if (packet.byteLength < packetBodyLength + varIntLength) return
  const packetBody = packet.slice(varIntLength, varIntLength + packetBodyLength)
  const [packetId, packetIdLength] = readVarInt(packetBody)
  const packetData = packetBody.slice(packetIdLength)
  return {
    id: packetId,
    data: packetData,
    packetLength: packetBodyLength + varIntLength
  }
}
// TODO: parseCompressedPacket.
