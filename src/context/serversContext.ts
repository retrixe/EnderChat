import React from 'react'
import { type protocolMap } from '../minecraft/utils'

export interface Server {
  version: keyof typeof protocolMap
  address: string
}

export type Servers = Record<string, Server>

export interface ServersContext {
  servers: Servers
  setServers: (newServers: Servers) => void
}

const serversContext = React.createContext<ServersContext>({
  servers: {},
  setServers: () => {}
})

export default serversContext
