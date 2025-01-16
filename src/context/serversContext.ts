import React from 'react'
import type { protocolMap } from '../minecraft/utils'

export interface Server {
  version: keyof typeof protocolMap
  address: string
  order?: number // LOW-TODO: Remove the undefined type.
}

export type Servers = Record<string, Server>

export interface ServersContext {
  servers: Servers
  setServers: (newServers: Servers) => void
}

const serversContext = React.createContext<ServersContext>({
  servers: {},
  setServers: () => {
    /* no-op */
  },
})

export default serversContext
