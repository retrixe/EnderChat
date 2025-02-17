import type { MinecraftChat } from '../chatToJsx'
import { concatPacketData, type PacketDataTypes } from '../packet'
import { parseChat, protocolMap, readVarInt, writeVarInt } from '../utils'
import packetIds from './ids'

interface PlayerChatMessage {
  signedChat: MinecraftChat
  unsignedChat?: MinecraftChat
  type: number
  displayName: MinecraftChat
}

export const parsePlayerChatMessage = (data: Buffer, version: number): PlayerChatMessage => {
  return version >= protocolMap['1.19.3']
    ? parsePlayerChatMessage1193(data, version)
    : version >= protocolMap['1.19.1']
      ? parsePlayerChatMessage1191(data, version)
      : parsePlayerChatMessage119(data, version)
}

const parsePlayerChatMessage119 = (data: Buffer, version: number): PlayerChatMessage => {
  const [signedChat, signedChatLength] = parseChat(data, version)
  data = data.slice(signedChatLength)
  const hasUnsignedChat = data.readInt8()
  data = data.slice(1)
  let unsignedChat: MinecraftChat | undefined
  if (hasUnsignedChat) {
    let unsignedChatLength
    ;[unsignedChat, unsignedChatLength] = parseChat(data, version)
    data = data.slice(unsignedChatLength)
  }
  const [type, typeLength] = readVarInt(data)
  data = data.slice(typeLength)
  data = data.slice(16) // Skip sender UUID
  const [displayName, displayNameLength] = parseChat(data, version)
  data = data.slice(displayNameLength)
  return { signedChat, unsignedChat, type, displayName }
}

const parsePlayerChatMessage1191 = (data: Buffer, version: number): PlayerChatMessage => {
  // TODO-1.19: https://minecraft.wiki/w/Minecraft_Wiki:Projects/wiki.vg_merge/Protocol?oldid=2772944
  // This is completely busted for now. Is it worth implementing? Who is using 1.19.1/1.19.2 anyway?
  return parsePlayerChatMessage119(data, version)
}

const parsePlayerChatMessage1193 = (data: Buffer, version: number): PlayerChatMessage => {
  data = data.slice(16) // Skip sender UUID
  data = data.slice(readVarInt(data)[1]) // Skip index
  const hasSignature = data.readInt8()
  data = data.slice(1) // Has signature
  if (hasSignature) data = data.slice(256) // Skip signature
  const [signedChat, signedChatLength] = parseChat(data)
  data = data.slice(signedChatLength + 8 + 8) // Skip timestamp and salt
  const [signatures, signaturesLength] = readVarInt(data)
  data = data.slice(signaturesLength)
  for (let i = 0; i < signatures; i++) {
    const [, idLength] = readVarInt(data)
    data = data.slice(idLength + 256) // Skip message ID and signature
  }
  const hasUnsignedChat = data.readInt8()
  data = data.slice(1)
  let unsignedChat: MinecraftChat | undefined
  if (hasUnsignedChat) {
    let unsignedChatLength
    ;[unsignedChat, unsignedChatLength] = parseChat(data, version)
    data = data.slice(unsignedChatLength)
  }
  const [filterType, filterTypeLength] = readVarInt(data)
  data = data.slice(filterTypeLength)
  if (filterType === 2) {
    const [filterTypeBits, filterTypeBitsLength] = readVarInt(data)
    data = data.slice(filterTypeBitsLength + filterTypeBits * 8)
  }
  const [type, typeLength] = readVarInt(data)
  data = data.slice(typeLength)
  const [displayName, displayNameLength] = parseChat(data, version)
  data = data.slice(displayNameLength)
  // Skip target name
  return { signedChat, unsignedChat, type, displayName }
}

export const makeChatMessagePacket = (
  msg: string,
  protocolVersion: number,
  msgSalt?: Buffer,
): [number, Buffer] => {
  const is1191 = protocolVersion >= protocolMap['1.19.1']
  const is1193 = protocolVersion >= protocolMap['1.19.3']
  if (protocolVersion < protocolMap[1.19]) {
    const id = packetIds.SERVERBOUND_CHAT_MESSAGE(protocolVersion)
    return [id ?? 0, concatPacketData([msg])]
  } else {
    const id = msg.startsWith('/')
      ? packetIds.SERVERBOUND_CHAT_COMMAND(protocolVersion)
      : packetIds.SERVERBOUND_CHAT_MESSAGE(protocolVersion)
    // 1.20.5 splits off signed chat commands.
    if (msg.startsWith('/') && protocolVersion >= protocolMap['1.20.5'])
      return [id ?? 0, concatPacketData([msg.substring(1)])]
    const timestamp = Buffer.alloc(8)
    timestamp.writeIntBE(Date.now(), 2, 6) // writeBigInt64BE(BigInt(Date.now()))
    const salt = msgSalt ?? Buffer.alloc(8)
    // TODO-1.19: Send signature(s), preview chat, last seen messages and last received message if possible.
    const data: PacketDataTypes[] = [
      msg.startsWith('/') ? msg.substring(1) : msg,
      timestamp,
      salt,
      writeVarInt(0),
      false,
    ]
    if (is1191) data.push(writeVarInt(0), writeVarInt(0))
    if (is1193) data.push(writeVarInt(0))
    return [id ?? 0, concatPacketData(data)]
  }
}
