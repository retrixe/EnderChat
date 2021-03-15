// Consider using Recoil instead of Context?
import React from 'react'
import tcp from 'react-native-tcp'

export interface Connection {
  socket: tcp.Socket | null // TODO: Remove this null from here.
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
