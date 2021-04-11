import React, { useContext, useEffect, useState } from 'react'

import {
  StyleSheet,
  View,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  RefreshControl
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import Ionicons from 'react-native-vector-icons/Ionicons'
import allSettled from 'promise.allsettled'

import globalStyle from '../globalStyle'
import { modernPing, Ping } from '../minecraft/pingServer'
import Dialog, { dialogStyles } from '../components/Dialog'
import Text from '../components/Text'
import TextField from '../components/TextField'
import ElevatedView from '../components/ElevatedView'
import ServersContext from '../context/serversContext'
import ConnectionContext from '../context/connectionContext'
import parseChatToJsx from '../minecraft/chatToJsx'
import useDarkMode from '../context/useDarkMode'

const ServerScreen = () => {
  const darkMode = useDarkMode()
  const { servers, setServers } = useContext(ServersContext)
  const { connection, setConnection } = useContext(ConnectionContext)

  // TODO: Have a single Recoil Atom which gets updated with state,
  // and individual Server components that re-render independently
  // of top-level component and ping servers on their own, or just
  // use customised React.memo+useState+props and skip using Recoil.
  const [ipAddr, setIpAddr] = useState('')
  const [ipAddrRed, setIpAddrRed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [newServerName, setNewServerName] = useState('')
  const [serverNameRed, setServerNameRed] = useState(false)
  const [serverVersion, setServerVersion] = useState<'1.16.5'>('1.16.5')
  const [addServerDialogOpen, setAddServerDialogOpen] = useState(false)
  const [editServerDialogOpen, setEditServerDialogOpen] = useState('')
  // TODO: Actually use IP to avoid rate limits.
  const [pingResponses, setPingResponses] = useState<{
    [name: string]: Ping | null
  }>({})

  useEffect(() => {
    if (Object.keys(pingResponses).length > 0) {
      return
    }
    const promises = []
    for (const serverName in servers) {
      const server = servers[serverName]
      const splitAddr = server.address.split(':')
      const portStr = splitAddr.pop() || ''
      let port = +portStr
      if (isNaN(+portStr)) {
        splitAddr.push(portStr)
        port = 25565
      }
      promises.push(
        modernPing({ host: splitAddr.join(':'), port }) // Run in parallel.
          .then(resp => setPingResponses(p => ({ ...p, [serverName]: resp })))
          .catch(() => setPingResponses(p => ({ ...p, [serverName]: null })))
      )
    }
    allSettled(promises).then(
      () => setRefreshing(false),
      () => setRefreshing(false)
    )
  }, [servers, pingResponses])

  const invalidServerName = newServerName.length > 32
  const cancelAddServer = () => {
    setAddServerDialogOpen(false)
    setServerVersion('1.16.5')
    setNewServerName('')
    setIpAddr('')
  }
  const addAccount = () => {
    if (
      !newServerName ||
      invalidServerName ||
      ipAddr === '' ||
      servers[newServerName]
    ) {
      setIpAddrRed(ipAddr === '')
      setServerNameRed(!newServerName)
      return
    }
    setServers({
      ...servers,
      [newServerName]: {
        version: serverVersion,
        address: ipAddr
      }
    })
    setPingResponses({})
    cancelAddServer()
  }
  const connectToServer = (server: string) => {
    if (!connection) {
      setConnection({
        serverName: server,
        socket: null
      })
    }
  }
  // TODO: Support editing servers.

  return (
    <>
      <Dialog
        visible={!!editServerDialogOpen}
        onRequestClose={() => setEditServerDialogOpen('')}
        containerStyles={styles.deleteServerDialog}
      >
        <Pressable
          onPress={() => {
            delete servers[editServerDialogOpen]
            setEditServerDialogOpen('')
            setServers(servers)
          }}
          android_ripple={{ color: '#aaa' }}
          style={dialogStyles.modalButton}
        >
          <Text style={styles.deleteServerText}>
            Delete '{editServerDialogOpen}' server
          </Text>
        </Pressable>
      </Dialog>
      <Dialog visible={addServerDialogOpen} onRequestClose={cancelAddServer}>
        <Text style={dialogStyles.modalTitle}>Add Server</Text>
        <TextField
          red={!!servers[newServerName] || serverNameRed || invalidServerName}
          value={newServerName}
          onChangeText={setNewServerName}
          placeholder='Server Name'
        />
        <TextField
          red={ipAddrRed}
          value={ipAddr}
          onChangeText={setIpAddr}
          placeholder='IP Address'
        />
        <Picker
          selectedValue={serverVersion}
          style={darkMode ? styles.addServerPickerDark : {}}
          onValueChange={itemValue => setServerVersion(itemValue)}
          dropdownIconColor={darkMode ? '#ffffff' : undefined}
        >
          <Picker.Item label='1.16.5' value='1.16.5' />
        </Picker>
        <View style={dialogStyles.modalButtons}>
          <View style={globalStyle.flexSpacer} />
          <Pressable
            onPress={cancelAddServer}
            android_ripple={{ color: '#aaa' }}
            style={dialogStyles.modalButton}
          >
            <Text
              style={
                darkMode
                  ? dialogStyles.modalButtonCancelDarkText
                  : dialogStyles.modalButtonCancelText
              }
            >
              CANCEL
            </Text>
          </Pressable>
          <Pressable
            onPress={addAccount}
            android_ripple={{ color: '#aaa' }}
            style={dialogStyles.modalButton}
          >
            <Text style={dialogStyles.modalButtonText}>ADD</Text>
          </Pressable>
        </View>
      </Dialog>
      <View style={darkMode ? globalStyle.darkHeader : globalStyle.header}>
        <Text style={globalStyle.title}>Servers</Text>
        <View style={globalStyle.flexSpacer} />
        <Ionicons.Button
          name='add'
          onPress={() => setAddServerDialogOpen(true)}
          iconStyle={globalStyle.iconStyle}
        >
          Add
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
          {Object.keys(servers).map(server => {
            const ping = pingResponses[server]
            return (
              <ElevatedView key={server} style={styles.serverView}>
                <Pressable
                  onPress={() => connectToServer(server)}
                  onLongPress={() => setEditServerDialogOpen(server)}
                  android_ripple={{ color: '#aaa' }}
                  style={styles.serverPressable}
                >
                  {ping != null ? (
                    <Image
                      source={
                        ping.favicon
                          ? { uri: ping.favicon }
                          : require('../pack.png')
                      }
                      style={styles.serverImage}
                    />
                  ) : (
                    <View style={styles.serverLoading}>
                      <ActivityIndicator
                        color='#00aaff'
                        size={Platform.select<number | 'large'>({
                          android: 48,
                          default: 'large'
                        })}
                      />
                    </View>
                  )}
                  <View style={styles.serverContent}>
                    <Text style={styles.serverName}>{server.trim()}</Text>
                    {ping != null ? (
                      <>
                        <Text style={styles.serverPlayers}>
                          {ping.players.online}/{ping.players.max} players
                          online | Ping: {ping.ping}ms
                        </Text>
                        {parseChatToJsx(ping.description, Text, {
                          style: styles.serverDescription
                        })}
                      </>
                    ) : (
                      <Text style={styles.serverDescription}>
                        {ping === null
                          ? 'Error while pinging...'
                          : 'Pinging...'}
                      </Text>
                    )}
                  </View>
                </Pressable>
              </ElevatedView>
            )
          })}
        </View>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  serverView: { marginBottom: 12 },
  serverPressable: { padding: 8, flexDirection: 'row' },
  serverImage: {
    resizeMode: 'contain',
    padding: 4,
    height: 72,
    width: 72
  },
  serverLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4
    // height: 72,
    // width: 72,
  },
  serverContent: { marginLeft: 8, flex: 2 },
  serverName: { fontSize: 20, fontWeight: 'bold' },
  serverPlayers: { fontSize: 12, fontWeight: '300' },
  serverDescription: { fontSize: 14 },
  deleteServerText: { fontSize: 16 },
  deleteServerDialog: { padding: 0 },
  addServerPickerDark: { color: '#ffffff' }
})

export default ServerScreen
