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
import { NativeStackScreenProps } from '@react-navigation/native-stack'
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
import useDarkMode from '../context/useDarkMode'
import ServersContext from '../context/serversContext'
import ConnectionContext from '../context/connectionContext'
import { parseIp, protocolMap } from '../minecraft/utils'
import {
  ChatToJsx,
  lightColorMap,
  mojangColorMap
} from '../minecraft/chatToJsx'

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

  const [ipAddr, setIpAddr] = useState('')
  const [ipAddrRed, setIpAddrRed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [newServerName, setNewServerName] = useState('')
  const [serverNameRed, setServerNameRed] = useState(false)
  const [serverVersion, setServerVersion] =
    useState<keyof typeof protocolMap>('auto')
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

  const invalidServerName = newServerName.length > 32

  const openEditServerDialog = (server: string) => {
    setEditServerDialogOpen(server)
    setNewServerName(server)
    setServerVersion(servers[server].version)
    setIpAddr(servers[server].address)
  }

  const cancelAddServer = () => {
    setEditServerDialogOpen(false)
    setServerVersion('auto')
    setNewServerName('')
    setIpAddr('')
    setIpAddrRed(false)
    setServerNameRed(false)
  }

  const deleteServer = () => {
    if (typeof editServerDialogOpen !== 'string') return cancelAddServer()
    delete servers[editServerDialogOpen]
    setServers(servers)
    cancelAddServer()
  }

  const editServer = () => {
    const edit = typeof editServerDialogOpen === 'string'
    if (
      !newServerName ||
      invalidServerName ||
      (!edit && servers[newServerName]) ||
      (edit && servers[newServerName] && newServerName !== editServerDialogOpen)
    ) {
      return setServerNameRed(true)
    } else if (ipAddr === '') {
      return setIpAddrRed(true)
    }
    const newServers = { ...servers }
    if (edit) delete newServers[editServerDialogOpen]
    servers[newServerName] = { version: serverVersion, address: ipAddr }
    setServers(newServers)
    setPingResponses({})
    cancelAddServer()
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

  const modalButtonCancelText = darkMode
    ? dialogStyles.modalButtonCancelDarkText
    : dialogStyles.modalButtonCancelText
  return (
    <>
      <Dialog visible={!!editServerDialogOpen} onRequestClose={cancelAddServer}>
        <Text style={dialogStyles.modalTitle}>
          {typeof editServerDialogOpen === 'string' ? 'Edit' : 'Add'} Server
        </Text>
        <TextField
          red={serverNameRed || invalidServerName}
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
          <Picker.Item label='1.19.1/1.19.2' value='1.19.1' />
          <Picker.Item label='1.19' value='1.19' />
          <Picker.Item label='1.18.2' value='1.18.2' />
          <Picker.Item label='1.18/1.18.1' value='1.18' />
          <Picker.Item label='1.17.1' value='1.17.1' />
          <Picker.Item label='1.17' value='1.17' />
          <Picker.Item label='1.16.4/1.16.5' value='1.16.4' />
        </Picker>
        <View style={dialogStyles.modalButtons}>
          {typeof editServerDialogOpen === 'string' && (
            <Pressable
              onPress={deleteServer}
              android_ripple={{ color: '#aaa' }}
              style={dialogStyles.modalButton}
            >
              <Text style={styles.deleteServerButtonText}>DELETE</Text>
            </Pressable>
          )}
          <View style={globalStyle.flexSpacer} />
          <Pressable
            onPress={cancelAddServer}
            android_ripple={{ color: '#aaa' }}
            style={dialogStyles.modalButton}
          >
            <Text style={modalButtonCancelText}>CANCEL</Text>
          </Pressable>
          <Pressable
            onPress={() => editServer()}
            android_ripple={{ color: '#aaa' }}
            style={dialogStyles.modalButton}
          >
            <Text style={dialogStyles.modalButtonText}>
              {typeof editServerDialogOpen === 'string' ? 'EDIT' : 'ADD'}
            </Text>
          </Pressable>
        </View>
      </Dialog>
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
          {Object.keys(servers).map(server => {
            const ping = pingResponses[servers[server].address]
            return (
              <ElevatedView key={server} style={styles.serverView}>
                <Pressable
                  onPress={() => connectToServer(server)}
                  onLongPress={() => openEditServerDialog(server)}
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
  serverImage: { resizeMode: 'contain', padding: 4, height: 72, width: 72 },
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
  addServerPickerDark: { color: '#ffffff' },
  addServerPicker: { color: '#000000' },
  deleteServerButtonText: { color: '#ff0000', fontWeight: 'bold' }
})

export default ServerScreen
