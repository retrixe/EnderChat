import zlib from 'zlib'
import { Buffer } from 'buffer'
import { toggleEndian, encodeString, readVarInt, writeVarInt } from './utils'

export const makeBasePacket = (packetId: number, data: Buffer) => {
  const finalData = Buffer.concat([writeVarInt(packetId), data])
  const finalDataLength = writeVarInt(finalData.byteLength)
  // VarInt Length(Packet ID + Data) + VarInt Packet ID + Byte Array Data
  return Buffer.concat([finalDataLength, finalData])
}

export const makeBaseCompressedPacket = (
  threshold: number,
  packetId: number,
  data: Buffer
) => {
  // VarInt Packet Length | Length of Data Length + compressed length of (Packet ID + Data)
  // VarInt Data Length   | Length of uncompressed (Packet ID + Data) or 0
  // VarInt Packet ID     | zlib compressed packet ID (see the sections below)
  // Byte Array Data      | zlib compressed packet data (see the sections below)
  const finalData = Buffer.concat([writeVarInt(packetId), data])
  const toCompress = finalData.byteLength >= threshold
  const dataLength = toCompress ? finalData.byteLength : 0
  /* : await new Promise((resolve, reject) => {
        zlib.deflate(finalData, (err, res) => err ? reject(err) : resolve(res))
      }) */
  const dataToSend = toCompress ? zlib.deflateSync(finalData) : finalData
  return makeBasePacket(dataLength, dataToSend)
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
  idLength: number // Length of the ID VarInt.
  dataLength: number // Length of the data after the packet ID.
  packetLength: number // Length of the entire packet.
  lengthLength: number // Length of the packet length VarInt.
  compressed?: boolean
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
    packetLength: packetBodyLength + varIntLength,
    lengthLength: varIntLength
  }
}

export const parseCompressedPacket = (packet: Buffer): Packet | undefined => {
  const dissect = parsePacket(packet)
  if (!dissect) return
  else if (dissect.id === 0) {
    const [id, idLength] = readVarInt(dissect.data)
    const data = dissect.data.slice(idLength)
    return {
      id,
      data,
      idLength,
      dataLength: data.length,
      packetLength: dissect.packetLength,
      lengthLength: dissect.lengthLength,
      compressed: false
    }
  }
  const dataLength = dissect.id
  let dataWithId: Buffer
  try {
    dataWithId = zlib.unzipSync(dissect.data, { finishFlush: 2 })
  } catch (e) {
    console.error(`problem inflating chunk
uncompressed length: ${dataLength}
compressed length: ${dissect.data.length}
theoretical compressed length: ${dissect.dataLength}`)
    // hex: ${compressedData.toString('hex')}`)
    throw e
  }
  const [id, idLength] = readVarInt(dataWithId)
  const data = dataWithId.slice(idLength)
  return {
    id,
    data,
    idLength,
    dataLength: data.length,
    packetLength: dissect.packetLength,
    lengthLength: dissect.lengthLength,
    compressed: true
  }
}
