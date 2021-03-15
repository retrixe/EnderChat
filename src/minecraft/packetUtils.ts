import { Buffer } from 'buffer'

// Adapted from https://wiki.vg/Protocol which is licensed under CC-BY-SA-3.0.
// VarLong is unsupported as JavaScript cannot fit VarLong except with BigInt.
// BigInt is unsupported in React Native at the moment.
export const readVarInt = (
  buffer: Buffer,
  offset: number = 0,
  varlong: boolean = false
): [number, number] => {
  let numRead = 0
  let result = 0
  let read: number
  do {
    read = buffer.readUInt8(offset + numRead)
    const value = read & 0b01111111
    result |= value << (7 * numRead)
    numRead++
    if (!varlong && numRead > 5) {
      throw new Error('VarInt is too big')
    } else if (varlong && numRead > 10) {
      throw new Error('VarLong is too big')
    }
  } while ((read & 0b10000000) !== 0)
  return [result, numRead]
}

export const writeVarInt = (value: number): Buffer => {
  let result = Buffer.alloc(0)
  do {
    let temp = value & 0b01111111
    // Note: >>> means that the sign bit is shifted with the rest of the number rather than being left alone
    value >>>= 7
    if (value !== 0) {
      temp |= 0b10000000
    }
    result = Buffer.concat([result, Buffer.from([temp])])
  } while (value !== 0)
  return result
}

// Code from here onwards is my own.
export const encodeString = (str: string): Buffer => {
  const buffer = Buffer.from(str, 'utf8')
  return Buffer.concat([writeVarInt(buffer.byteLength), buffer])
}
