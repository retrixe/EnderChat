import { MUtf8Decoder } from 'mutf-8'

const mutf8Decoder = new MUtf8Decoder()

export type Value = string | number | bigint | Buffer | Value[] | { [key: string]: Value }

export const parseTag = (buffer: Buffer, offset: number): [string, Value, number] => {
  const type = buffer.readUInt8(offset)
  const nameLength = buffer.readUInt16BE(offset + 1)
  const name = mutf8Decoder.decode(buffer.slice(offset + 3, offset + 3 + nameLength))
  const [value, size] = parseTagValue(type, buffer, offset + 3 + nameLength)
  return [name, value, 1 + 2 + nameLength + size] // Size = Type + Name length + Name + Value
}

const parseTagValue = (type: number, buffer: Buffer, offset: number): [Value, number] => {
  let value: Value
  let size: number
  switch (type) {
    case 1: // Byte
      value = buffer.readInt8(offset)
      size = 1
      break
    case 2: // Short
      value = buffer.readInt16BE(offset)
      size = 2
      break
    case 3: // Int
      value = buffer.readInt32BE(offset)
      size = 4
      break
    case 4: // Long
      value = buffer.readBigInt64BE(offset)
      size = 8
      break
    case 5: // Float
      value = buffer.readFloatBE(offset)
      size = 4
      break
    case 6: // Double
      value = buffer.readDoubleBE(offset)
      size = 8
      break
    // Byte Array
    case 7: {
      const length = buffer.readInt32BE(offset)
      size = 4
      value = buffer.slice(offset + size, offset + size + length)
      size += length
      break
    }
    // String
    case 8: {
      const length = buffer.readUint16BE(offset)
      size = 2
      value = mutf8Decoder.decode(buffer.slice(offset + size, offset + size + length))
      size += length
      break
    }
    // List
    case 9: {
      const contentType = buffer.readUInt8(offset)
      size = 1
      const length = buffer.readInt32BE(offset + size)
      size += 4
      value = []
      for (let i = 0; i < length; i++) {
        const [val, valSize] = parseTagValue(contentType, buffer, offset + size)
        value.push(val)
        size += valSize
      }
      break
    }
    // Compound
    case 10:
      value = {}
      size = 0
      while (buffer.readUInt8(offset + size) !== 0 /* End tag */) {
        const [name, val, valSize] = parseTag(buffer, offset + size)
        value[name] = val
        size += valSize
      }
      size += 1 // End tag
      break
    // Int Array
    case 11: {
      const length = buffer.readInt32BE(offset)
      size = 4
      value = []
      for (let i = 0; i < length; i++) {
        value.push(buffer.readInt32BE(offset + size))
        size += 4
      }
      break
    }
    // Long Array
    case 12: {
      const length = buffer.readInt32BE(offset)
      size = 4
      value = []
      for (let i = 0; i < length; i++) {
        value.push(buffer.readBigInt64BE(offset + size))
        size += 8
      }
      break
    }
    default:
      throw new Error(`Unknown tag type: ${type}`)
  }
  return [value, size]
}

export const parseFullNBT = (buffer: Buffer): [Record<string, Value>, number] => {
  const parsed: Record<string, Value> = {}
  let offset = 0
  while (offset < buffer.length) {
    const [name, value, size] = parseTag(buffer, offset)
    parsed[name] = value
    offset += size
  }
  return [parsed, offset]
}

export const parseAnonymousNBT = (buffer: Buffer): [Value, number] => {
  const type = buffer.readUInt8(0)
  const [value, size] = parseTagValue(type, buffer, 1)
  return [value, size + 1]
}
