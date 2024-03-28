import React, { useContext, useEffect, useState } from 'react'
import { View, ScrollView, RefreshControl } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { type NativeStackScreenProps } from '@react-navigation/native-stack'

import { type RootStackParamList } from '../App'
import EditServerDialog from '../components/servers/EditServerDialog'
import ServerDisplay from '../components/servers/ServerDisplay'
import globalStyle from '../globalStyle'
import {
  type LegacyPing,
  legacyPing,
  modernPing,
  type Ping
} from '../minecraft/pingServer'
import Text from '../components/Text'
import useDarkMode from '../context/useDarkMode'
import ServersContext from '../context/serversContext'
import ConnectionContext from '../context/connectionContext'
import { parseIp, protocolMap } from '../minecraft/utils'

type Props = NativeStackScreenProps<RootStackParamList, 'Servers'>

const ServerScreen = (props: Props): JSX.Element => {
  const darkMode = useDarkMode()
  const { servers, setServers } = useContext(ServersContext)
  const { setDisconnectReason } = useContext(ConnectionContext)

  const [refreshing, setRefreshing] = useState(false)
  const [editServerDialogOpen, setEditServerDialogOpen] = useState<
    string | boolean
  >(false)
  const [pingResponses, setPingResponses] = useState<
    // false - no route, null - unknown err, undefined - pinging
    Record<string, LegacyPing | Ping | false | null | undefined>
  >({})

  useEffect(() => {
    if (Object.keys(pingResponses).length > 0) {
      return
    }
    const ips: string[] = []
    const promises = []
    for (const serverName in servers) {
      const { address: ipAddress } = servers[serverName]
      if (ips.includes(ipAddress)) continue
      else ips.push(ipAddress)
      const [host, port] = parseIp(ipAddress)
      promises.push(
        modernPing({ host, port }) // Run in parallel.
          .then(resp => setPingResponses(p => ({ ...p, [ipAddress]: resp })))
          .catch(err => {
            if (err.toString() === 'Error: No route to host') {
              setPingResponses(p => ({ ...p, [ipAddress]: false }))
              return
            }
            legacyPing({ host, port })
              .then(res => setPingResponses(p => ({ ...p, [ipAddress]: res })))
              .catch(() => setPingResponses(p => ({ ...p, [ipAddress]: null })))
          })
      )
    }
    Promise.allSettled(promises).then(
      () => setRefreshing(false),
      () => setRefreshing(false)
    )
  }, [servers, pingResponses])

  const openEditServerDialog = (server: string): void => {
    setEditServerDialogOpen(server)
  }

  const editServer = (
    serverName: string,
    version: keyof typeof protocolMap,
    address: string,
    order?: number
  ): void => {
    const edit = typeof editServerDialogOpen === 'string'
    const lastOrder = Object.values(servers).reduce(
      (max, e) => (e.order > max ? e.order : max),
      0
    )
    const newOrder =
      order ?? // the lengths we will go to avoid conditionals...
      ((edit || undefined) && servers[editServerDialogOpen as string].order) ??
      lastOrder + 1
    const newServers = { ...servers }
    if (edit) delete newServers[editServerDialogOpen]
    newServers[serverName.trim()] = { version, address, order: newOrder }
    setServers(newServers)
    setPingResponses({})
  }

  const deleteServer = (server: string): void => {
    const newServers = { ...servers }
    delete newServers[server]
    setServers(newServers)
  }

  const connectToServer = (serverName: string): void => {
    let version = protocolMap[servers[serverName].version]
    if (version === -1) {
      const ping = pingResponses[servers[serverName].address]
      // Try the latest.
      if (!ping) version = protocolMap.latest
      else if (typeof ping.version === 'object') {
        version = ping.version.protocol
      } else version = (ping as LegacyPing).protocol
    }
    if (version < 754) {
      return setDisconnectReason({
        server: serverName,
        reason: 'EnderChat only supports 1.16.4 and newer (for now).'
      })
    } else if (version > protocolMap.latest) {
      return setDisconnectReason({
        server: serverName,
        reason:
          '§lThis version of EnderChat does not support the Minecraft version required by this server!\n\n' +
          '§oPossible solutions:§r' +
          '\n1. Make sure EnderChat is up to date.' +
          '\n2. Try editing the server and setting the version manually.'
      })
    }
    props.navigation.push('Chat', { serverName, version }) // getId prevents duplicate navigation.
  }

  return (
    <>
      <EditServerDialog
        servers={servers}
        darkMode={darkMode}
        editServer={editServer}
        deleteServer={deleteServer}
        editServerDialogOpen={editServerDialogOpen}
        setEditServerDialogOpen={setEditServerDialogOpen}
      />
      <View style={darkMode ? globalStyle.darkHeader : globalStyle.header}>
        <Text style={globalStyle.title}>EnderChat</Text>
        <View style={globalStyle.flexSpacer} />
        <Ionicons.Button
          name='add'
          onPress={() => setEditServerDialogOpen(true)}
          iconStyle={globalStyle.iconStyle}
        >
          <Text style={globalStyle.iconButtonText}>Add</Text>
        </Ionicons.Button>
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            colors={['#00aaff']}
            refreshing={refreshing}
            onRefresh={() => {
              setPingResponses({})
              setRefreshing(true)
            }}
          />
        }
      >
        <View style={globalStyle.outerView}>
          {Object.keys(servers)
            .sort((a, b) => (servers[a].order ?? 0) - (servers[b].order ?? 0))
            .map(server => (
              <ServerDisplay
                key={server}
                ping={pingResponses[servers[server].address]}
                server={server}
                darkMode={darkMode}
                connectToServer={connectToServer}
                openEditServerDialog={openEditServerDialog}
              />
            ))}
        </View>
      </ScrollView>
    </>
  )
}

export default ServerScreen
