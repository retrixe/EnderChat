import React, { useContext, useEffect, useRef, useState } from 'react'
import {
  FlatList,
  StyleSheet,
  View,
  ActivityIndicator,
  Platform
} from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'

import globalStyle from '../globalStyle'
import useDarkMode from '../context/useDarkMode'
import SettingsContext from '../context/settingsContext'
import ConnectionContext from '../context/connectionContext'
import parseChatToJsx, { mojangColorMap } from '../minecraft/chatToJsx'
import { concatPacketData } from '../minecraft/packet'
import { readVarInt } from '../minecraft/packetUtils'
import TextField from '../components/TextField'
import Text from '../components/Text'

type ChatNavigationProp = NativeStackNavigationProp<
  { Home: undefined; Chat: undefined },
  'Chat'
>
type Messages = Array<{ key: number; text: JSX.Element }>

let id = 0
const ChatScreen = ({ navigation }: { navigation: ChatNavigationProp }) => {
  const darkMode = useDarkMode()
  const { settings } = useContext(SettingsContext)
  const { connection, setConnection } = useContext(ConnectionContext)
  const [messages, setMessages] = useState<Messages>([])
  const [loggedIn, setLoggedIn] = useState(false)
  const [message, setMessage] = useState('')
  const loggedInRef = useRef(false)

  // Packet handler useEffect.
  useEffect(() => {
    if (!connection) return
    connection.connection.on('packet', packet => {
      if (!loggedInRef.current && connection.connection.loggedIn) {
        setLoggedIn(true)
        loggedInRef.current = true
        if (settings.sendJoinMessage) {
          connection.connection
            .writePacket(0x03, concatPacketData([settings.joinMessage]))
            .catch(console.error)
        }
        if (settings.sendSpawnCommand) {
          connection.connection
            .writePacket(0x03, concatPacketData(['/spawn']))
            .catch(console.error)
        }
      } else if (packet.id === 0x0f) {
        const [chatLength, chatVarIntLength] = readVarInt(packet.data)
        const chatJson = packet.data
          .slice(chatVarIntLength, chatVarIntLength + chatLength)
          .toString('utf8')
        // TODO: Gracefully handle parsing errors.
        const position = packet.data.readInt8(chatVarIntLength + chatLength)
        // LOW-TODO: Support position 2 and sender.
        if (position === 0 || position === 1) {
          setMessages(m => {
            const c = parseChatToJsx(JSON.parse(chatJson), Text, mojangColorMap)
            return [{ key: id++, text: c }].concat(m)
          })
        }
      }
    })
    return () => {
      connection.connection.removeAllListeners('packet')
    }
  }, [
    connection,
    settings.joinMessage,
    settings.sendJoinMessage,
    settings.sendSpawnCommand
  ])

  // Cleanup useEffect on unload.
  useEffect(() => {
    if (!connection) {
      navigation.goBack() // Safety net.
      return
    }
    return () => {
      // Gracefully disconnect, destroy will be called in 20s automatically if needed.
      connection.connection.close()
      setConnection(undefined)
    }
  }, [connection, setConnection, navigation])

  const sendMessage = () => {
    if (!connection || !message) return
    setMessage('')
    connection.connection
      .writePacket(0x03, concatPacketData([message]))
      .catch(console.error)
  }

  if (!connection) return <></> // This should never be hit hopefully.
  const title =
    connection.serverName.length > 12
      ? connection.serverName.substring(0, 9) + '...'
      : connection.serverName
  return (
    <>
      <View style={darkMode ? globalStyle.darkHeader : globalStyle.header}>
        <Ionicons.Button
          name='chevron-back-sharp'
          iconStyle={styles.backButtonIcon}
          backgroundColor='#363636'
          onPress={() => navigation.goBack()}
        />
        <Text style={[globalStyle.title, styles.title]}>Chat - {title}</Text>
        <View style={globalStyle.flexSpacer} />
        {/* TODO: Make this actually work. */}
        <Ionicons.Button
          name='settings-outline'
          iconStyle={styles.backButtonIcon}
          backgroundColor='#363636'
        />
      </View>
      {!loggedIn && (
        <View style={styles.loadingScreen}>
          <ActivityIndicator
            color='#00aaff'
            size={Platform.select<number | 'large'>({
              android: 64,
              default: 'large'
            })}
          />
          <Text style={styles.loadingScreenText}>Connecting...</Text>
        </View>
      )}
      {loggedIn && ( // https://reactnative.dev/docs/optimizing-flatlist-configuration
        <>
          <FlatList
            inverted
            data={messages}
            style={styles.chatArea}
            contentContainerStyle={styles.chatAreaScrollView}
            renderItem={({ item }) => item.text}
          />
          <View style={darkMode ? styles.textAreaDark : styles.textArea}>
            <TextField
              value={message}
              onChangeText={setMessage}
              style={styles.textField}
              onSubmitEditing={sendMessage}
              enablesReturnKeyAutomatically
              returnKeyType='send'
              blurOnSubmit={false}
              autoCorrect={!settings.disableAutoCorrect}
            />
            <Ionicons.Button name='ios-send-sharp' onPress={sendMessage}>
              Send
            </Ionicons.Button>
          </View>
        </>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  title: { marginLeft: 8, textAlignVertical: 'center' },
  backButtonIcon: { marginRight: 0 },
  chatArea: { padding: 8, flex: 1 },
  chatAreaScrollView: { paddingBottom: 16 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingScreenText: { paddingTop: 24, fontSize: 20 },
  textAreaDark: {
    padding: 8,
    flexDirection: 'row',
    backgroundColor: '#242424'
  },
  textArea: { padding: 8, backgroundColor: '#fff', flexDirection: 'row' },
  textField: { marginTop: 0, flex: 1, marginRight: 8 }
})

export default ChatScreen
