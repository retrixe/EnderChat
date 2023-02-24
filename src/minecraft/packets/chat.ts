import { concatPacketData, PacketDataTypes } from '../packet'
import { protocolMap, writeVarInt } from '../utils'
import packetIds from './ids'

export const makeChatMessagePacket = (
  msg: string,
  protocolVersion: number,
  msgSalt?: Buffer
): [number, Buffer] => {
  const is119 = protocolVersion >= protocolMap[1.19]
  const is1191 = protocolVersion >= protocolMap['1.19.1']
  const is1193 = protocolVersion >= protocolMap['1.19.3']
  if (!is119) {
    const id = packetIds.SERVERBOUND_CHAT_MESSAGE(protocolVersion)
    return [id ?? 0, concatPacketData([msg])]
  } else {
    const id = msg.startsWith('/')
      ? packetIds.SERVERBOUND_CHAT_COMMAND(protocolVersion)
      : packetIds.SERVERBOUND_CHAT_MESSAGE(protocolVersion)
    const timestamp = Buffer.alloc(8)
    timestamp.writeIntBE(Date.now(), 2, 6) // writeBigInt64BE(BigInt(Date.now()))
    const salt = msgSalt ?? Buffer.alloc(8)
    // TODO-1.19: Send signature(s), preview chat, last seen messages and last received message if possible.
    const data: PacketDataTypes[] = [
      msg.startsWith('/') ? msg.substring(1) : msg,
      timestamp,
      salt,
      writeVarInt(0),
      false
    ]
    if (is1191) data.push(writeVarInt(0), writeVarInt(0))
    if (is1193) data.push(writeVarInt(0))
    return [id ?? 0, concatPacketData(data)]
  }
}
