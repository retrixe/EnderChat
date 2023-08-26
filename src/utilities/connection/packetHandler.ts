import type React from 'react'
import { type MinecraftChat, parseValidJson } from '../../minecraft/chatToJsx'
import {
  ConnectionState,
  type ServerConnection
} from '../../minecraft/connection'
import {
  concatPacketData,
  type Packet,
  type PacketDataTypes
} from '../../minecraft/packet'
import { protocolMap, readVarInt, writeVarInt } from '../../minecraft/utils'
import { makeChatMessagePacket } from '../../minecraft/packets/chat'
import packetIds from '../../minecraft/packets/ids'

export const enderChatPrefix = '\u00A74[\u00A7cEnderChat\u00A74] \u00A7c'
export const parseMessageError = 'An error occurred when parsing chat.'
export const unknownError = 'An unknown error occurred.'
export const clientSettingsError =
  'An error occurred when sending client settings.'
export const inventoryCloseError =
  'An error occurred when closing an inventory window.'
export const respawnError =
  'An error occurred when trying to respawn after death.'
export const deathRespawnMessage = enderChatPrefix + 'You died! Respawning...'
export const sendMessageError = 'Failed to send message to server!'
export const healthMessage =
  enderChatPrefix + "You're losing health! \u00A7b%prev \u00A7f-> \u00A7c%new"

type HandleError = (
  addMsg: (text: MinecraftChat) => void,
  translated: string
) => (error: unknown) => any

interface PlayerChatMessage {
  signedChat: string
  unsignedChat?: string
  type: number
  displayName: string
}

const parsePlayerChatMessage = (data: Buffer): PlayerChatMessage => {
  const [signedChatLength, signedChatVarIntLength] = readVarInt(data)
  data = data.slice(signedChatVarIntLength)
  const signedChat = data.slice(0, signedChatLength).toString('utf8')
  data = data.slice(signedChatLength)
  const hasUnsignedChat = data.readInt8()
  data = data.slice(1)
  let unsignedChat
  if (hasUnsignedChat) {
    const [unsignedChatLength, unsignedChatVarIntLength] = readVarInt(data)
    data = data.slice(unsignedChatVarIntLength)
    unsignedChat = data.slice(0, unsignedChatLength).toString('utf8')
    data = data.slice(unsignedChatLength)
  }
  const [type, typeLength] = readVarInt(data)
  data = data.slice(typeLength)
  data = data.slice(16) // Skip sender UUID
  const [displayNameLength, displayNameVarIntLength] = readVarInt(data)
  data = data.slice(displayNameVarIntLength)
  const displayName = data.slice(0, displayNameLength).toString('utf8')
  return { signedChat, unsignedChat, type, displayName }
}

const handleSystemMessage = (
  packet: Packet,
  addMessage: (text: MinecraftChat) => void,
  handleError: HandleError,
  is1191: boolean
): void => {
  try {
    const [chatLength, chatVarIntLength] = readVarInt(packet.data)
    const chatJson = packet.data
      .slice(chatVarIntLength, chatVarIntLength + chatLength)
      .toString('utf8')
    // TODO: Support position 2 (action bar), true (action bar) and sender for disableChat/blocked players.
    // TODO-1.19: 3 say command, 4 msg command, 5 team msg command, 6 emote command, 7 tellraw command, also in Player Chat Message.
    const position = packet.data.readInt8(chatVarIntLength + chatLength)
    if (!is1191 && (position === 0 || position === 1)) {
      addMessage(parseValidJson(chatJson))
    } else if (is1191 && !position) {
      addMessage(parseValidJson(chatJson))
    }
  } catch (e) {
    handleError(addMessage, parseMessageError)(e)
  }
}

export const packetHandler =
  (
    healthRef: React.MutableRefObject<number | null>,
    setLoading: React.Dispatch<React.SetStateAction<string>>,
    connection: ServerConnection,
    addMessage: (text: MinecraftChat) => any,
    joinMessage: string,
    sendJoinMessage: boolean,
    sendSpawnCommand: boolean,
    handleError: HandleError,
    charLimit: number
  ) =>
  (packet: Packet) => {
    const { protocolVersion: version } = connection.options
    if (connection.state === ConnectionState.LOGIN) {
      setLoading('')
      const messageToSend = joinMessage.substring(0, charLimit).trim()
      if (sendJoinMessage && messageToSend) {
        connection
          .writePacket(...makeChatMessagePacket(messageToSend, version))
          .catch(handleError(addMessage, sendMessageError))
      }
      if (sendSpawnCommand) {
        connection
          .writePacket(...makeChatMessagePacket('/spawn', version))
          .catch(handleError(addMessage, sendMessageError))
      }
    }

    const is117 = version >= protocolMap[1.17]
    const is118 = version >= protocolMap[1.18]
    const is1191 = version >= protocolMap['1.19.1']
    if (packet.id === packetIds.CLIENTBOUND_LOGIN_PLAY(version)) {
      // Send Client Settings packet.
      const clientSettingsId =
        packetIds.SERVERBOUND_CLIENT_SETTINGS(version) ?? 0
      const viewDistance = Buffer.alloc(1)
      viewDistance.writeInt8(2)
      const skinParts = Buffer.alloc(1)
      skinParts.writeUInt8(0b11111111)
      // TODO: Intl in future? And other setting changes too.
      const packetData: PacketDataTypes[] = [
        'en_US',
        viewDistance,
        writeVarInt(0),
        true,
        skinParts,
        writeVarInt(1)
      ]
      if (is117) packetData.push(!is118)
      if (is118) packetData.push(true)
      connection
        .writePacket(clientSettingsId, concatPacketData(packetData))
        .catch(handleError(addMessage, clientSettingsError))
    } else if (packet.id === packetIds.CLIENTBOUND_RESPAWN(version)) {
      // Send spawn command when switching worlds.
      if (sendSpawnCommand) {
        connection
          .writePacket(...makeChatMessagePacket('/spawn', version))
          .catch(handleError(addMessage, sendMessageError))
      }
    } else if (packet.id === packetIds.CLIENTBOUND_CHAT_MESSAGE(version)) {
      handleSystemMessage(packet, addMessage, handleError, is1191)
    } else if (
      packet.id === packetIds.CLIENTBOUND_SYSTEM_CHAT_MESSAGE(version)
    ) {
      handleSystemMessage(packet, addMessage, handleError, is1191)
    } else if (
      packet.id === packetIds.CLIENTBOUND_PLAYER_CHAT_MESSAGE(version)
    ) {
      try {
        const { type, displayName, signedChat, unsignedChat } =
          parsePlayerChatMessage(packet.data)
        // TODO-1.19: Support sender team name
        if (type === 0 || type === 1) {
          addMessage({
            translate: 'chat.type.text',
            with: [
              parseValidJson(displayName),
              parseValidJson(unsignedChat ?? signedChat)
            ]
          })
        }
      } catch (e) {
        handleError(addMessage, parseMessageError)(e)
      }
    } else if (packet.id === packetIds.CLIENTBOUND_OPEN_WINDOW(version)) {
      // Just close the window.
      const [windowId] = readVarInt(packet.data)
      const buf = Buffer.alloc(1)
      buf.writeUInt8(windowId)
      connection // Close Window (serverbound)
        .writePacket(packetIds.SERVERBOUND_CLOSE_WINDOW(version) ?? 0, buf)
        .catch(handleError(addMessage, inventoryCloseError))
    } else if (
      packet.id === packetIds.CLIENTBOUND_DEATH_COMBAT_EVENT(version)
    ) {
      let data = packet.data
      if (!is117) {
        const [action, actionLen] = readVarInt(data)
        if (action !== 2) return
        data = data.slice(actionLen)
      }
      data = data.slice(readVarInt(data)[1] + 4) // Remove Player/Entity ID
      const [chatLen, chatViLength] = readVarInt(data)
      const deathMessage = parseValidJson(
        data.slice(chatViLength, chatViLength + chatLen).toString('utf8')
      )
      if (
        (typeof deathMessage === 'string' && deathMessage.trim()) ||
        deathMessage?.text ||
        deathMessage?.extra?.length > 0
      ) {
        addMessage(deathMessage)
      }
      // Automatically respawn.
      // LOW-TODO: Should this be manual, or a dialog, like MC?
      addMessage(deathRespawnMessage)
      const clientStatusId = packetIds.SERVERBOUND_CLIENT_STATUS(version) ?? 0
      connection // Client Status
        .writePacket(clientStatusId, writeVarInt(0))
        .catch(handleError(addMessage, respawnError))
    } else if (packet.id === packetIds.CLIENTBOUND_UPDATE_HEALTH(version)) {
      const newHealth = packet.data.readFloatBE(0)
      if (healthRef.current != null && healthRef.current > newHealth) {
        const info = healthMessage
          .replace('%prev', healthRef.current.toString())
          .replace('%new', newHealth.toString())
        addMessage(info)
      } // LOW-TODO: Long-term it would be better to have a UI.
      healthRef.current = newHealth
    } else if (packet.id === packetIds.CLIENTBOUND_PING(version)) {
      connection // Pong (play)
        .writePacket(packetIds.SERVERBOUND_PONG(version) ?? 0, packet.data)
        .catch(handleError(addMessage, unknownError))
    }
  }
