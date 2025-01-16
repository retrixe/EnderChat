import { createHash, publicEncrypt } from 'react-native-crypto'
import type { ConnectionOptions, ServerConnection } from '.'
import { joinMinecraftSession } from '../api/mojang'
import { concatPacketData, type Packet, type PacketDataTypes } from '../packet'
import { getRandomBytes, mcHexDigest, protocolMap, readVarInt, writeVarInt } from '../utils'

export const parseEncryptionRequestPacket = (packet: Packet): [Buffer, Buffer, Buffer] => {
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

export const getLoginPacket = (opts: ConnectionOptions): Buffer => {
  const data: PacketDataTypes[] = [opts.username]
  if (opts.protocolVersion >= protocolMap[1.19] && opts.protocolVersion < protocolMap['1.19.3']) {
    data.push(false)
    /* TODO: Support chat signing properly.
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
    } */
  }
  if (opts.protocolVersion >= protocolMap['1.19.1']) {
    if (opts.protocolVersion < protocolMap['1.20.2']) {
      data.push(concatPacketData([!!opts.selectedProfile]))
    }
    if (opts.selectedProfile) {
      const msb = Buffer.from(opts.selectedProfile.substring(0, 16), 'hex')
      const lsb = Buffer.from(opts.selectedProfile.substring(16), 'hex')
      data.push(concatPacketData([msb, lsb]))
    } else if (opts.protocolVersion >= protocolMap['1.20.2']) {
      data.push(concatPacketData([Buffer.alloc(8), Buffer.alloc(8)]))
    }
  }
  return concatPacketData(data)
}

export const handleEncryptionRequest = (
  packet: Packet,
  accessToken: string,
  selectedProfile: string,
  connection: ServerConnection,
  callback: (secret: Buffer, response: Buffer) => Promise<void>,
): void => {
  // https://wiki.vg/Protocol_Encryption
  const [serverId, publicKey, verifyToken] = parseEncryptionRequestPacket(packet)
  ;(async () => {
    const secret = await getRandomBytes(16) // Generate random 16-byte shared secret.
    // Generate hash.
    const sha1 = createHash('sha1')
    sha1.update(serverId) // ASCII encoding of the server id string from Encryption Request
    sha1.update(secret)
    sha1.update(publicKey) // Server's encoded public key from Encryption Request
    const hash = mcHexDigest(sha1.digest())
    // Send hash to Mojang servers.
    const req = await joinMinecraftSession(accessToken, selectedProfile, hash)
    if (!req.ok) {
      throw new Error('Mojang online mode network request failed')
    }
    // Encrypt shared secret and verify token with public key.
    const pk =
      '-----BEGIN PUBLIC KEY-----\n' + publicKey.toString('base64') + '\n-----END PUBLIC KEY-----'
    const ePrms = { key: pk, padding: 1 } // RSA_PKCS1_PADDING
    const encryptedSharedSecret = publicEncrypt(ePrms, secret)
    const encryptedVerifyToken = publicEncrypt(ePrms, verifyToken)
    // Send encryption response packet.
    // From this point forward, everything is encrypted, including the Login Success packet.
    const response: PacketDataTypes[] = [
      writeVarInt(encryptedSharedSecret.byteLength),
      encryptedSharedSecret,
      writeVarInt(encryptedVerifyToken.byteLength),
      encryptedVerifyToken,
    ]
    const { protocolVersion } = connection.options
    if (protocolVersion >= protocolMap['1.19']) {
      connection.msgSalt = await getRandomBytes(8)
      if (protocolVersion < protocolMap['1.19.3']) response.splice(2, 0, true)
    }
    // This callback will send the response and enable the ciphers.
    await callback(secret, concatPacketData(response))
  })().catch((e: unknown) => {
    console.error(e)
    connection.disconnectReason = '{"text":"Failed to authenticate with Mojang servers!"}'
    connection.close()
  })
}
