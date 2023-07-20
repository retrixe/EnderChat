import React from 'react'
import { type MinecraftChat } from '../minecraft/chatToJsx'
import { type ServerConnection } from '../minecraft/connection'

export interface DisconnectReason {
  server: string
  reason: MinecraftChat
}

export interface ConnectionContext {
  connection?: ServerConnection
  setConnection: (newConnection?: ServerConnection) => void
  disconnectReason?: DisconnectReason
  setDisconnectReason: (newDisconnectReason?: DisconnectReason) => void
}

const connectionContext = React.createContext<ConnectionContext>({
  setConnection: () => {},
  setDisconnectReason: () => {}
})

export default connectionContext
