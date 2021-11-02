// Consider using Recoil instead of Context?
import React from 'react'
import { protocolMap } from '../minecraft/utils'

export interface Server {
  version: keyof typeof protocolMap
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
