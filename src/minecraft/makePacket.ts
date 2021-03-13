import zlib from 'zlib'
import { Buffer } from 'buffer'
import { writeVarInt } from './packetDataTypes'
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
        return toggleEndian(Buffer.from(field, 'utf16le'), 2)
      } else if (typeof field === 'boolean') {
        return Buffer.from([field ? 0x01 : 0x00])
      } else if (Buffer.isBuffer(field)) return field
      else return toggleEndian(Buffer.from([field]))
    })
  )
