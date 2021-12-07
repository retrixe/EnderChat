import { Buffer } from 'buffer'

export const protocolMap = {
  '1.16.4': 754,
  '1.16.5': 754,
  1.17: 755,
  '1.17.1': 756,
  1.18: 757,
  auto: -1
}

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
  if (srvRecords && srvRecords.length) {
    // LOW-TODO: Support SRV priority/weight.
    const record = srvRecords.map((r: { data: string }) => r.data.split(' '))[0]
    return [record[3], +record[2]]
  } else return [hostname, port]
}
