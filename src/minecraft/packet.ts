import zlib from 'zlib'
import { Buffer } from 'buffer'
import { toggleEndian } from './utils'
import { encodeString, readVarInt, writeVarInt } from './packetUtils'

export const makeBasePacket = (packetId: number, data: Buffer) => {
  const finalData = Buffer.concat([writeVarInt(packetId), data])
  const finalDataLength = writeVarInt(finalData.byteLength)
  // VarInt Length(Packet ID + Data) + VarInt Packet ID + Byte Array Data
  return Buffer.concat([finalDataLength, finalData])
}

export const makeBaseCompressedPacket = async (
  threshold: number,
  packetId: number,
  data: Buffer
) => {
  const finalData = Buffer.concat([writeVarInt(packetId), data])
  const toCompress = finalData.byteLength > threshold
  const finalDataLength = writeVarInt(toCompress ? finalData.byteLength : 0)
  const compressedData: Buffer = toCompress
    ? finalData
    : await new Promise((resolve, reject) => {
        zlib.deflate(finalData, (err, res) =>
          err ? reject(err) : resolve(res)
        )
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
      if (typeof field === 'string') return encodeString(field)
      else if (typeof field === 'boolean') {
        return Buffer.from([field ? 0x01 : 0x00])
      } else if (Buffer.isBuffer(field)) return field
      else return toggleEndian(Buffer.from([field]))
    })
  )

export interface Packet {
  id: number
  data: Buffer
  idLength: number
  dataLength: number
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
    idLength: packetIdLength,
    dataLength: packetBodyLength - packetIdLength,
    packetLength: packetBodyLength + varIntLength
  }
}

export const parseCompressedPacket = (packet: Buffer): Packet | undefined => {
  if (packet.byteLength === 0) return
  const [packetLength, packetVarIntLength] = readVarInt(packet)
  if (packet.byteLength < packetLength + packetVarIntLength) return
  const remainingPacket = packet.slice(
    packetVarIntLength,
    packetVarIntLength + packetLength
  )
  const [dataLength, dataVarIntLength] = readVarInt(remainingPacket)
  const compressedData = remainingPacket.slice(dataVarIntLength)
  const uncompressedData: Buffer =
    dataLength === 0
      ? compressedData
      : (() => {
          try {
            return zlib.unzipSync(compressedData, { finishFlush: 2 })
          } catch (e) {
            console.error(`problem inflating chunk
            uncompressed length: ${dataLength}
            compressed length: ${compressedData.length}
            theoretical compressed length: ${packetLength - dataVarIntLength}`)
            // hex: ${compressedData.toString('hex')}`)
            throw e
          }
        })()
  // : await new Promise((resolve, reject) => {
  //    zlib.inflate(compressedData, { finishFlush: 2 }, (err, res) => (
  //     err ? reject(err) : resolve(res)
  //    ))
  //  })
  const [packetId, packetIdLength] = readVarInt(uncompressedData)
  const packetData = uncompressedData.slice(packetIdLength)
  return {
    id: packetId,
    data: packetData,
    idLength: packetIdLength,
    dataLength: dataLength - packetIdLength,
    packetLength: packetLength + packetVarIntLength
  }
}
