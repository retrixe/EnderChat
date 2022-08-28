import { ConnectionOptions } from '.'
import { concatPacketData, Packet, PacketDataTypes } from '../packet'
import { protocolMap, readVarInt, writeVarInt } from '../utils'

export const parseEncryptionRequestPacket = (packet: Packet) => {
  // ASCII encoding of the server id string
  let data = packet.data
  const [sidLen, sidLenLen] = readVarInt(data)
  const serverId = data.slice(sidLenLen, sidLenLen + sidLen)
  // Server's encoded public key
  data = data.slice(sidLen + sidLenLen)
  const [pkLen, pkLenLen] = readVarInt(data)
  const publicKey = data.slice(pkLenLen, pkLen + pkLenLen)
  // Server's randomly generated verify token
  data = data.slice(pkLen + pkLenLen)
  const [vtLen, vtLenLen] = readVarInt(data)
  const verifyToken = data.slice(vtLenLen, vtLenLen + vtLen)

  return [serverId, publicKey, verifyToken]
}

export const getLoginPacket = (opts: ConnectionOptions) => {
  const data: PacketDataTypes[] = [opts.username]
  if (opts.protocolVersion >= protocolMap[1.19]) {
    data.push(!!opts.certificate)
    if (opts.certificate) {
      let buf = Buffer.alloc(8)
      buf.writeIntBE(new Date(opts.certificate.expiresAt).getTime(), 2, 6) // writeBigInt64BE
      data.push(buf)
      const publicKeyBase64Data = opts.certificate.keyPair.publicKey
        .replace(/\n/g, '')
        .replace('-----BEGIN RSA PUBLIC KEY-----', '')
        .replace('-----END RSA PUBLIC KEY-----', '')
        .trim()
      buf = Buffer.from(publicKeyBase64Data, 'base64')
      data.push(writeVarInt(buf.byteLength))
      data.push(buf)
      buf = Buffer.from(opts.certificate.publicKeySignature, 'base64')
      data.push(writeVarInt(buf.byteLength))
      data.push(buf)
    }
    if (opts.protocolVersion >= protocolMap['1.19.1']) {
      if (opts.selectedProfile) {
        const msb = Buffer.from(opts.selectedProfile.substring(0, 16), 'hex')
        const lsb = Buffer.from(opts.selectedProfile.substring(16), 'hex')
        data.push(concatPacketData([true, msb, lsb]))
      } else data.push(concatPacketData([false]))
    }
  }
  return concatPacketData(data)
}
