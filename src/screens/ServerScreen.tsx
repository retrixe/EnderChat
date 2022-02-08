import React, { useContext, useEffect, useRef, useState } from 'react'
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
import {
  LegacyPing,
  legacyPing,
  modernPing,
  Ping
} from '../minecraft/pingServer'
import Dialog, { dialogStyles } from '../components/Dialog'
import Text from '../components/Text'
import TextField from '../components/TextField'
import ElevatedView from '../components/ElevatedView'
import ServersContext from '../context/serversContext'
import AccountsContext from '../context/accountsContext'
import ConnectionContext from '../context/connectionContext'
import { resolveHostname, protocolMap } from '../minecraft/utils'
import initiateConnection from '../minecraft/connection'
import {
  ChatToJsx,
  lightColorMap,
  mojangColorMap,
  parseValidJson
} from '../minecraft/chatToJsx'
import useDarkMode from '../context/useDarkMode'

const parseIp = (ipAddress: string): [string, number] => {
  const splitAddr = ipAddress.split(':')
  const portStr = splitAddr.pop() || ''
  let port = +portStr
  if (isNaN(+portStr)) {
    splitAddr.push(portStr)
    port = 25565
  }
  return [splitAddr.join(':'), port]
}

const ServerScreen = () => {
  const darkMode = useDarkMode()
  const { servers, setServers } = useContext(ServersContext)
  const { accounts } = useContext(AccountsContext)
  const { connection, setConnection, disconnectReason, setDisconnectReason } =
    useContext(ConnectionContext)
  const initiatingConnection = useRef(false)

  const [ipAddr, setIpAddr] = useState('')
  const [ipAddrRed, setIpAddrRed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [newServerName, setNewServerName] = useState('')
  const [serverNameRed, setServerNameRed] = useState(false)
  const [serverVersion, setServerVersion] =
    useState<keyof typeof protocolMap>('auto')
  const [addServerDialogOpen, setAddServerDialogOpen] = useState(false)
  const [editServerDialogOpen, setEditServerDialogOpen] = useState('')
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

  const invalidServerName = newServerName.length > 32
  const cancelAddServer = () => {
    setAddServerDialogOpen(false)
    setServerVersion('auto')
    setNewServerName('')
    setIpAddr('')
    setIpAddrRed(false)
    setServerNameRed(false)
  }
  const addServer = () => {
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
  const connectToServer = async (server: string) => {
    if (initiatingConnection.current) return
    if (!connection) {
      initiatingConnection.current = true
      const [hostname, portNumber] = parseIp(servers[server].address)
      const [host, port] = await resolveHostname(hostname, portNumber)
      const activeAccount = Object.keys(accounts).find(e => accounts[e].active)
      if (!activeAccount) {
        initiatingConnection.current = false
        return setDisconnectReason({
          server,
          reason:
            'No active account selected! Open the Accounts tab and add an account.'
        })
      }
      let protocolVersion = protocolMap[servers[server].version]
      if (protocolVersion === -1) {
        const ping = pingResponses[servers[server].address]
        // Try the latest.
        if (!ping) protocolVersion = protocolMap['1.18.1']
        else if (typeof ping.version === 'object') {
          protocolVersion = ping.version.protocol
        } else protocolVersion = (ping as LegacyPing).protocol
      }
      if (protocolVersion < 754) {
        initiatingConnection.current = false
        return setDisconnectReason({
          server,
          reason: 'EnderChat only supports 1.16.4 and newer for now.'
        })
      }
      // TODO: Refresh token before trying to connect.
      const uuid = accounts[activeAccount].type ? activeAccount : undefined
      const newConn = await initiateConnection({
        host,
        port,
        username: accounts[activeAccount].username,
        protocolVersion,
        selectedProfile: uuid,
        accessToken: accounts[activeAccount].accessToken
      })
      const onCloseOrError = () => {
        setConnection(undefined)
        if (newConn.disconnectReason) {
          setDisconnectReason({
            server,
            reason: parseValidJson(newConn.disconnectReason)
          })
        }
      }
      newConn.on('close', onCloseOrError)
      newConn.on('error', onCloseOrError)
      setConnection({
        serverName: server,
        connection: newConn
      })
      initiatingConnection.current = false
    }
  }

  // LOW-TODO: Support editing servers.
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
      {disconnectReason && (
        <Dialog visible onRequestClose={() => setDisconnectReason()}>
          <Text style={dialogStyles.modalTitle}>
            Disconnected from {disconnectReason.server}
          </Text>
          <ChatToJsx
            chat={disconnectReason.reason}
            component={Text}
            colorMap={darkMode ? mojangColorMap : lightColorMap}
            componentProps={{ style: styles.serverDescription }}
          />
          <View style={dialogStyles.modalButtons}>
            <View style={globalStyle.flexSpacer} />
            <Pressable
              onPress={() => setDisconnectReason()}
              android_ripple={{ color: '#aaa' }}
              style={dialogStyles.modalButton}
            >
              <Text style={dialogStyles.modalButtonText}>CLOSE</Text>
            </Pressable>
          </View>
        </Dialog>
      )}
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
          style={darkMode ? styles.addServerPickerDark : styles.addServerPicker}
          onValueChange={itemValue => setServerVersion(itemValue)}
          dropdownIconColor={darkMode ? '#ffffff' : '#000000'}
        >
          <Picker.Item label='Auto' value='auto' />
          <Picker.Item label='1.18/1.18.1' value='1.18' />
          <Picker.Item label='1.17.1' value='1.17.1' />
          <Picker.Item label='1.17' value='1.17' />
          <Picker.Item label='1.16.4/1.16.5' value='1.16.4' />
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
            onPress={addServer}
            android_ripple={{ color: '#aaa' }}
            style={dialogStyles.modalButton}
          >
            <Text style={dialogStyles.modalButtonText}>ADD</Text>
          </Pressable>
        </View>
      </Dialog>
      <View style={darkMode ? globalStyle.darkHeader : globalStyle.header}>
        <Text style={globalStyle.title}>EnderChat</Text>
        <View style={globalStyle.flexSpacer} />
        <Ionicons.Button
          name='add'
          onPress={() => setAddServerDialogOpen(true)}
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
          {Object.keys(servers).map(server => {
            const ping = pingResponses[servers[server].address]
            return (
              <ElevatedView key={server} style={styles.serverView}>
                <Pressable
                  onPress={async () => await connectToServer(server)}
                  onLongPress={() => setEditServerDialogOpen(server)}
                  android_ripple={{ color: '#aaa' }}
                  style={styles.serverPressable}
                >
                  {ping ? (
                    <Image
                      source={
                        (ping as Ping).favicon
                          ? { uri: (ping as Ping).favicon }
                          : require('../assets/pack.png')
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
                    {ping ? (
                      <>
                        <Text style={styles.serverPlayers}>
                          {(ping as Ping).players?.online ??
                            (ping as LegacyPing).online}
                          /
                          {(ping as Ping).players?.max ??
                            (ping as LegacyPing).maxPlayers}{' '}
                          players online | Ping: {ping.ping}ms
                        </Text>
                        <ChatToJsx
                          chat={
                            (ping as Ping).description ??
                            (ping as LegacyPing).motd
                          }
                          component={Text}
                          colorMap={darkMode ? mojangColorMap : lightColorMap}
                          componentProps={{ styles: styles.serverDescription }}
                          trim
                        />
                      </>
                    ) : (
                      <Text style={styles.serverDescription}>
                        {ping === null
                          ? 'An error occurred when pinging server.'
                          : ping === false
                          ? 'No route to host!'
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
  serverPlayers: { fontSize: 12, fontWeight: 'bold' },
  serverDescription: { fontSize: 14 },
  deleteServerText: { fontSize: 16 },
  deleteServerDialog: { padding: 0 },
  addServerPickerDark: { color: '#ffffff' },
  addServerPicker: { color: '#000000' }
})

export default ServerScreen
