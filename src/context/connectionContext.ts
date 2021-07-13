// Consider using Recoil instead of Context?
import React from 'react'
import { ServerConnection } from '../minecraft/connection'

export interface Connection {
  connection: ServerConnection
  serverName: string
}

export interface ConnectionContext {
  connection?: Connection
  setConnection: (newConnection?: Connection) => void
}

const connectionContext = React.createContext<ConnectionContext>({
  setConnection: () => {}
})

export default connectionContext
