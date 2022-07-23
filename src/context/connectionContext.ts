import React from 'react'
import { MinecraftChat } from '../minecraft/chatToJsx'
import { ServerConnection } from '../minecraft/connection'

export interface Connection {
  connection: ServerConnection
  serverName: string
}

export interface DisconnectReason {
  server: string
  reason: MinecraftChat
}

export interface ConnectionContext {
  connection?: Connection
  setConnection: (newConnection?: Connection) => void
  disconnectReason?: DisconnectReason
  setDisconnectReason: (newDisconnectReason?: DisconnectReason) => void
}

const connectionContext = React.createContext<ConnectionContext>({
  setConnection: () => {},
  setDisconnectReason: () => {}
})

export default connectionContext
