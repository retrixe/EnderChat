import React, { useContext, useEffect, useState } from 'react'
import { View, ScrollView, RefreshControl } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import allSettled from 'promise.allsettled'

import EditServerDialog from '../components/servers/EditServerDialog'
import ServerDisplay from '../components/servers/ServerDisplay'
import globalStyle from '../globalStyle'
import {
  LegacyPing,
  legacyPing,
  modernPing,
  Ping
} from '../minecraft/pingServer'
import Text from '../components/Text'
import useDarkMode from '../context/useDarkMode'
import ServersContext from '../context/serversContext'
import ConnectionContext from '../context/connectionContext'
import { parseIp, protocolMap } from '../minecraft/utils'

interface RootStackParamList {
  [index: string]: any
  Home: undefined
  Chat: { serverName: string; version: number }
}
type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>

const ServerScreen = (props: Props) => {
  const darkMode = useDarkMode()
  const { servers, setServers } = useContext(ServersContext)
  const { setDisconnectReason } = useContext(ConnectionContext)

  const [refreshing, setRefreshing] = useState(false)
  const [editServerDialogOpen, setEditServerDialogOpen] = useState<
    string | boolean
  >(false)
  const [pingResponses, setPingResponses] = useState<{
    // false - no route, null - unknown err, undefined - pinging
    [ip: string]: LegacyPing | Ping | false | null | undefined
  }>({})

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
    allSettled(promises).then(
      () => setRefreshing(false),
      () => setRefreshing(false)
    )
  }, [servers, pingResponses])

  const openEditServerDialog = (server: string) => {
    setEditServerDialogOpen(server)
  }

  const editServer = (
    serverName: string,
    version: keyof typeof protocolMap,
    address: string
  ) => {
    const edit = typeof editServerDialogOpen === 'string'
    const newServers = { ...servers }
    if (edit) delete newServers[editServerDialogOpen]
    newServers[serverName] = { version, address }
    setServers(newServers)
    setPingResponses({})
  }

  const deleteServer = (server: string) => {
    const newServers = { ...servers }
    delete newServers[server]
    setServers(newServers)
  }

  const connectToServer = (serverName: string) => {
    let version = protocolMap[servers[serverName].version]
    if (version === -1) {
      const ping = pingResponses[servers[serverName].address]
      // Try the latest.
      if (!ping) version = protocolMap['1.19.1']
      else if (typeof ping.version === 'object') {
        version = ping.version.protocol
      } else version = (ping as LegacyPing).protocol
    }
    if (version < 754) {
      return setDisconnectReason({
        server: serverName,
        reason: 'EnderChat only supports 1.16.4 and newer (for now).'
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
          {Object.keys(servers).map(server => (
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
