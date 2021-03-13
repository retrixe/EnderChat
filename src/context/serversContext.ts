// Consider using Recoil instead of Context?
import React from 'react'

export interface Server {
  version: '1.16.5'
  address: string
}

export interface Servers {
  [name: string]: Server
}

export interface ServersContext {
  servers: Servers
  setServers: (newServers: Servers) => void
}

const serversContext = React.createContext<ServersContext>({
  servers: {},
  setServers: () => {}
})

export default serversContext
