import { Buffer } from 'buffer'

export const padBufferToLength = (buffer: Buffer, length: number) =>
  length <= buffer.byteLength
    ? buffer
    : Buffer.concat([
        Buffer.from(Array(length - buffer.byteLength).fill(0x00)),
        buffer
      ])

export const toggleEndian = (buffer: Buffer, bytes: number = buffer.length) => {
  const output = Buffer.alloc(buffer.length)
  if (buffer.length % bytes !== 0) {
    throw new Error(
      `Buffer has ${buffer.length % bytes} trailing bits not aligned`
    )
  }
  // For each word..
  for (let i = 0; i < buffer.length; i += bytes) {
    // For each byte..
    for (let j = 0; j < bytes; j++) {
      output[i + (bytes - j - 1)] = buffer[i + j] // Swap the bytes.
    }
  }
  return output
}
