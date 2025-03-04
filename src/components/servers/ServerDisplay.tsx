import React from 'react'
import { StyleSheet, View, Image, Pressable, ActivityIndicator, Platform } from 'react-native'

import Text from '../Text'
import ElevatedView from '../ElevatedView'
import type { LegacyPing, Ping } from '../../minecraft/pingServer'
import { ChatToJsx, lightColorMap, mojangColorMap } from '../../minecraft/chatToJsx'

import PackIcon from '../../assets/pack.png'

const ServerDisplay = ({
  ping,
  server,
  darkMode,
  connectToServer,
  openEditServerDialog,
}: {
  ping: false | LegacyPing | Ping | null | undefined
  server: string
  darkMode: boolean
  connectToServer: (server: string) => void
  openEditServerDialog: (server: string) => void
}): React.JSX.Element => (
  <ElevatedView style={styles.serverView}>
    <Pressable
      onPress={() => connectToServer(server)}
      onLongPress={() => openEditServerDialog(server)}
      android_ripple={{ color: '#aaa' }}
      style={styles.serverPressable}
    >
      {ping ? (
        <Image
          source={'favicon' in ping && ping.favicon ? { uri: ping.favicon } : PackIcon}
          style={styles.serverImage}
        />
      ) : (
        <View style={styles.serverLoading}>
          <ActivityIndicator
            color='#00aaff'
            size={Platform.select<number | 'large'>({
              android: 48,
              default: 'large',
            })}
          />
        </View>
      )}
      <View style={styles.serverContent}>
        <Text style={styles.serverName}>{server.trim()}</Text>
        {ping ? (
          <>
            <Text style={styles.serverPlayers}>
              {'players' in ping ? ping.players.online : ping.online}/
              {'players' in ping ? ping.players.max : ping.maxPlayers} players online | Ping:{' '}
              {ping.ping}ms
            </Text>
            <ChatToJsx
              chat={'description' in ping ? ping.description : ping.motd}
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

const styles = StyleSheet.create({
  serverView: { marginBottom: 12 },
  serverPressable: { padding: 8, flexDirection: 'row' },
  serverImage: { resizeMode: 'contain', padding: 4, height: 72, width: 72 },
  serverLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    // height: 72,
    // width: 72,
  },
  serverContent: { marginLeft: 8, flex: 2 },
  serverName: { fontSize: 20, fontWeight: 'bold' },
  serverPlayers: { fontSize: 12, fontWeight: 'bold' },
  serverDescription: { fontSize: 14 },
})

export default ServerDisplay
