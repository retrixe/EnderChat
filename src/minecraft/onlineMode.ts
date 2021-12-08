import { randomBytes } from 'react-native-crypto'

export const generateSharedSecret = async () =>
  await new Promise<Buffer>((resolve, reject) => {
    randomBytes(16, (err, buf) => {
      if (err) reject(err)
      else resolve(buf)
    })
  })

// Credits for following 2 functions: https://gist.github.com/andrewrk/4425843
export function mcHexDigest(hash: Buffer) {
  // check for negative hashes
  const negative = hash.readInt8(0) < 0
  if (negative) performTwosCompliment(hash)
  let digest = hash.toString('hex')
  // trim leading zeroes
  digest = digest.replace(/^0+/g, '')
  if (negative) digest = '-' + digest
  return digest
}

function performTwosCompliment(buffer: Buffer) {
  let carry = true
  let newByte, value
  for (let i = buffer.length - 1; i >= 0; --i) {
    value = buffer.readUInt8(i)
    newByte = ~value & 0xff
    if (carry) {
      carry = newByte === 0xff
      buffer.writeUInt8(carry ? 0 : newByte + 1, i)
    } else {
      buffer.writeUInt8(newByte, i)
    }
  }
}
