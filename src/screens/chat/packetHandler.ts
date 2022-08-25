import React from 'react'
import { Status } from './ChatScreen'
import { MinecraftChat, parseValidJson } from '../../minecraft/chatToJsx'
import { ServerConnection } from '../../minecraft/connection'
import { concatPacketData, Packet } from '../../minecraft/packet'
import { protocolMap, readVarInt, writeVarInt } from '../../minecraft/utils'

export const enderChatPrefix = '\u00A74[\u00A7cEnderChat\u00A74] \u00A7c'
export const parseMessageError = 'An error occurred when parsing chat.'
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

const handleSystemMessage = (
  packet: Packet,
  addMessage: (text: MinecraftChat) => void,
  handleError: HandleError,
  is1191: boolean
) => {
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
    statusRef: React.MutableRefObject<Status>,
    setLoggedIn: React.Dispatch<React.SetStateAction<boolean>>,
    connection: ServerConnection,
    addMessage: (text: MinecraftChat) => any,
    joinMessage: string,
    sendJoinMessage: boolean,
    sendSpawnCommand: boolean,
    handleError: HandleError,
    charLimit: number
  ) =>
  (packet: Packet) => {
    if (statusRef.current === 'CONNECTING' && connection.loggedIn) {
      setLoggedIn(true)
      statusRef.current = 'CONNECTED'
      if (sendJoinMessage) {
        connection
          .writePacket(
            0x03,
            concatPacketData([joinMessage.substring(0, charLimit)])
          )
          .catch(handleError(addMessage, sendMessageError))
      }
      if (sendSpawnCommand) {
        connection
          .writePacket(0x03, concatPacketData(['/spawn']))
          .catch(handleError(addMessage, sendMessageError))
      }
    }

    const is117 = connection.options.protocolVersion >= protocolMap[1.17]
    const is119 = connection.options.protocolVersion >= protocolMap[1.19]
    const is1191 = connection.options.protocolVersion >= protocolMap['1.19.1']
    if (
      /* Chat Message (clientbound) */
      (packet.id === 0x0e && !is117) ||
      (packet.id === 0x0f && is117 && !is119)
    ) {
      handleSystemMessage(packet, addMessage, handleError, is1191)
    } else if (
      /* System Chat Message (clientbound) */
      (packet.id === 0x5f && is119 && !is1191) ||
      (packet.id === 0x62 && is1191)
    ) {
      handleSystemMessage(packet, addMessage, handleError, is1191)
    } else if (
      /* Player Chat Message (clientbound) */
      (packet.id === 0x30 && is119 && !is1191) ||
      (packet.id === 0x33 && is1191)
    ) {
      try {
        const [signedChatLen, signedChatViLen] = readVarInt(packet.data)
        const signedChat = packet.data
          .slice(signedChatViLen, signedChatViLen + signedChatLen)
          .toString('utf8')
        const totalSignedChatLen = signedChatViLen + signedChatLen
        const hasUnsignedChat = packet.data.readInt8(totalSignedChatLen)
        const moreData = packet.data.slice(totalSignedChatLen + 1)
        if (hasUnsignedChat) {
          const [unsignedChatLen, unsignedChatViLen] = readVarInt(moreData)
          const unsignedChat = moreData
            .slice(unsignedChatViLen, unsignedChatViLen + unsignedChatLen)
            .toString('utf8')
          const totalUnsignedChatLen = unsignedChatViLen + unsignedChatLen
          const position = moreData.readInt8(totalUnsignedChatLen)
          const [displayNameLen, displayNameViLen] = readVarInt(moreData, 17)
          const nameViLenOffset = 17 + displayNameViLen
          const displayName = moreData
            .slice(nameViLenOffset, nameViLenOffset + displayNameLen)
            .toString('utf8')
          if (position === 0 || position === 1) {
            addMessage({
              translate: 'chat.type.text',
              with: [parseValidJson(displayName), parseValidJson(unsignedChat)]
            })
          }
        } else {
          const position = moreData.readInt8()
          const [displayNameLen, displayNameViLen] = readVarInt(moreData, 17)
          const nameViLenOffset = 17 + displayNameViLen
          const displayName = moreData
            .slice(nameViLenOffset, nameViLenOffset + displayNameLen)
            .toString('utf8')
          if (position === 0 || position === 1) {
            addMessage({
              translate: 'chat.type.text',
              with: [parseValidJson(displayName), parseValidJson(signedChat)]
            })
          }
        }
        // TODO-1.19: Support sender team name
      } catch (e) {
        handleError(addMessage, parseMessageError)(e)
      }
    } else if (
      /* Open Window */
      (packet.id === 0x2e && !is119) ||
      (packet.id === 0x2b && is119 && !is1191) ||
      (packet.id === 0x2d && is119)
    ) {
      // Just close the window.
      const [windowId] = readVarInt(packet.data)
      const buf = Buffer.alloc(1)
      buf.writeUInt8(windowId)
      connection // Close Window (serverbound)
        .writePacket(is1191 ? 0x0c : is119 ? 0x0b : is117 ? 0x09 : 0x0a, buf)
        .catch(handleError(addMessage, inventoryCloseError))
    } else if (
      /* Death Combat Event */
      (packet.id === 0x31 && !is117) ||
      (packet.id === 0x35 && is117 && !is119) ||
      (packet.id === 0x33 && is119 && !is1191) ||
      (packet.id === 0x36 && is1191)
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
      addMessage(deathRespawnMessage)
      if (
        (typeof deathMessage === 'string' && deathMessage.trim()) ||
        deathMessage?.text ||
        deathMessage?.extra?.length > 0
      ) {
        addMessage(deathMessage)
      }
      // Automatically respawn.
      // LOW-TODO: Should this be manual, or a dialog, like MC?
      connection // Client Status
        .writePacket(is1191 ? 0x07 : is119 ? 0x06 : 0x04, writeVarInt(0))
        .catch(handleError(addMessage, respawnError))
    } else if (
      /* Update Health */
      (packet.id === 0x49 && !is117) ||
      (packet.id === 0x52 && is117 && !is1191) ||
      (packet.id === 0x55 && is1191)
    ) {
      const newHealth = packet.data.readFloatBE(0)
      if (healthRef.current != null && healthRef.current > newHealth) {
        const info = healthMessage
          .replace('%prev', healthRef.current.toString())
          .replace('%new', newHealth.toString())
        addMessage(info)
      } // LOW-TODO: Long-term it would be better to have a UI.
      healthRef.current = newHealth
    }
  }
