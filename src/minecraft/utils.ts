// Other crypto libraries: simple-crypto, sha256, aes-crypto and rsa-native
import { randomBytes } from 'react-native-randombytes'
import { Buffer } from 'buffer'
import { type MinecraftChat } from './chatToJsx'
import { parseAnonymousNBT } from './nbt'

export const protocolMap = {
  '1.16.4': 754,
  '1.16.5': 754,
  1.17: 755,
  '1.17.1': 756,
  1.18: 757,
  '1.18.1': 757,
  '1.18.2': 758,
  1.19: 759,
  '1.19.1': 760,
  '1.19.2': 760,
  '1.19.3': 761,
  '1.19.4': 762,
  '1.20': 763,
  '1.20.1': 763,
  '1.20.2': 764,
  '1.20.3': 765,
  '1.20.4': 765,
  '1.20.5': 766,
  '1.20.6': 766,
  latest: 766,
  auto: -1
}

export const padBufferToLength = (buffer: Buffer, length: number): Buffer =>
  length <= buffer.byteLength
    ? buffer
    : Buffer.concat([
        Buffer.from(Array(length - buffer.byteLength).fill(0x00)),
        buffer
      ])

export const toggleEndian = (
  buffer: Buffer,
  bytes: number = buffer.length
): Buffer => {
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

export const parseIp = (ipAddress: string): [string, number] => {
  const splitAddr = ipAddress.split(':')
  const portStr = splitAddr.pop() ?? ''
  let port = +portStr
  if (isNaN(+portStr)) {
    splitAddr.push(portStr)
    port = 25565
  }
  return [splitAddr.join(':'), port]
}

export const resolveHostname = async (
  hostname: string,
  port: number,
  retry: boolean = false // Not intended to be set by user.
): Promise<[string, number]> => {
  const req = await fetch(
    retry
      ? `https://dns.google/resolve?name=_minecraft._tcp.${hostname}&type=srv&do=1`
      : `https://cloudflare-dns.com/dns-query?name=_minecraft._tcp.${hostname}&type=SRV`,
    { headers: { accept: 'application/dns-json' } }
  )
  if (!req.ok && !retry) return await resolveHostname(hostname, port, true)
  else if (!req.ok) throw new Error('Failed to make DNS query!')
  const res = await req.json()
  const srvRecords = res.Answer?.filter((r: any) => r.type === 33 && r.data)
  if (srvRecords?.length) {
    // TODO: Support SRV priority/weight, maybe?
    const record = srvRecords.map((r: { data: string }) => r.data.split(' '))[0]
    return [record[3], +record[2]]
  } else return [hostname, port]
}

export const getRandomBytes = async (size: number): Promise<Buffer> =>
  await new Promise<Buffer>((resolve, reject) => {
    randomBytes(size, (err, buf) => {
      if (err) reject(err)
      else resolve(buf)
    })
  })

// Credits for following 2 functions: https://gist.github.com/andrewrk/4425843
export function mcHexDigest(hash: Buffer): string {
  // check for negative hashes
  const negative = hash.readInt8(0) < 0
  if (negative) performTwosCompliment(hash)
  let digest = hash.toString('hex')
  // trim leading zeroes
  digest = digest.replace(/^0+/g, '')
  if (negative) digest = '-' + digest
  return digest
}

function performTwosCompliment(buffer: Buffer): void {
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

// Minecraft data type utilities.
export const encodeString = (str: string): Buffer => {
  const buffer = Buffer.from(str, 'utf8')
  return Buffer.concat([writeVarInt(buffer.byteLength), buffer])
}

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

export const parseChat = (
  data: string | Buffer,
  version?: number
): [MinecraftChat | string, number] => {
  if (typeof data === 'string') {
    return [parseJsonChat(data), data.length]
  } else if (!version || version < protocolMap['1.20.3']) {
    const [chatLen, chatViLength] = readVarInt(data)
    const chat = data.slice(chatViLength, chatViLength + chatLen)
    return [parseJsonChat(chat.toString('utf8')), chatViLength + chatLen]
  } else {
    return parseAnonymousNBT(data)
  }
}

export const parseJsonChat = (chat: string): MinecraftChat => {
  try {
    return JSON.parse(chat)
  } catch (e) {
    return chat
  }
}
