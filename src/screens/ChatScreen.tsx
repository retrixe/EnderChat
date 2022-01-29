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
import {
  ChatToJsx,
  parseValidJson,
  mojangColorMap,
  lightColorMap,
  MinecraftChat,
  ColorMap
} from '../minecraft/chatToJsx'
import { concatPacketData } from '../minecraft/packet'
import { readVarInt } from '../minecraft/packetUtils'
import TextField from '../components/TextField'
import Text from '../components/Text'

import SettingScreen from './settings/SettingScreen'

type ChatNavigationProp = NativeStackNavigationProp<
  { Home: undefined; Chat: undefined },
  'Chat'
>
interface Message {
  key: number
  text: MinecraftChat
}

const renderItem = (colorMap: ColorMap) => {
  const ItemRenderer = ({ item }: { item: Message }) => (
    <View style={styles.androidScaleInvert}>
      <ChatToJsx chat={item.text} component={Text} colorMap={colorMap} />
    </View>
  )
  return ItemRenderer // LOW-TODO: Performance implications?
} // https://reactnative.dev/docs/optimizing-flatlist-configuration
const ChatMessageList = (props: { messages: Message[]; darkMode: boolean }) => {
  return (
    <FlatList
      inverted={Platform.OS !== 'android'}
      data={props.messages}
      style={[styles.androidScaleInvert, styles.chatArea]}
      contentContainerStyle={styles.chatAreaScrollView}
      renderItem={renderItem(props.darkMode ? mojangColorMap : lightColorMap)}
    />
  )
}
const ChatMessageListMemo = React.memo(
  ChatMessageList,
  (prevProps, nextProps) => prevProps.messages === nextProps.messages
)

const createErrorHandler = (
  color: string,
  addMessage: (text: MinecraftChat) => void,
  translated: string
) => (error: unknown) => {
  console.error(error)
  addMessage('[EnderChat] ' + translated)
}
const sendMessageErr = 'Failed to send message to server!'
const parseMessageErr = 'An error occurred when parsing chat.'

let id = 0
// TODO: Ability to copy text.
const ChatScreen = ({ navigation }: { navigation: ChatNavigationProp }) => {
  const darkMode = useDarkMode()
  const { settings } = useContext(SettingsContext)
  const { connection, setConnection } = useContext(ConnectionContext)
  const [, setCommandHistory] = useState<string[]>([]) // TODO
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [loggedIn, setLoggedIn] = useState(false)
  const [message, setMessage] = useState('')
  const loggedInRef = useRef(false)

  const charLimit =
    connection && connection.connection.options.protocolVersion >= 306 // 16w38a
      ? 256
      : 100
  const colorMap = darkMode ? mojangColorMap : lightColorMap
  const addMessage = (text: MinecraftChat) =>
    setMessages(m => {
      const trunc = m.length > 500 ? m.slice(0, 499) : m
      return [{ key: id++, text }].concat(trunc)
    })

  // Packet handler useEffect.
  useEffect(() => {
    if (!connection) return
    connection.connection.on('packet', packet => {
      if (!loggedInRef.current && connection.connection.loggedIn) {
        setLoggedIn(true)
        loggedInRef.current = true
        const errorHandler = createErrorHandler(
          colorMap.dark_red,
          addMessage,
          sendMessageErr
        )
        if (settings.sendJoinMessage) {
          connection.connection
            .writePacket(
              0x03,
              concatPacketData([settings.joinMessage.substring(charLimit)])
            )
            .catch(errorHandler)
        }
        if (settings.sendSpawnCommand) {
          connection.connection
            .writePacket(0x03, concatPacketData(['/spawn']))
            .catch(errorHandler)
        }
      } else if (packet.id === 0x0f) {
        try {
          const [chatLength, chatVarIntLength] = readVarInt(packet.data)
          const chatJson = packet.data
            .slice(chatVarIntLength, chatVarIntLength + chatLength)
            .toString('utf8')
          const position = packet.data.readInt8(chatVarIntLength + chatLength)
          // TODO: Support position 2 and sender.
          if (position === 0 || position === 1) {
            addMessage(parseValidJson(chatJson))
          }
        } catch (e) {
          createErrorHandler(colorMap.dark_red, addMessage, parseMessageErr)(e)
        }
      }
    })
    return () => {
      connection.connection.removeAllListeners('packet')
    }
  }, [
    colorMap,
    charLimit,
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
    const trim = message.trim()
    if (!connection || !trim) return
    setMessage('')
    if (trim.startsWith('/')) setCommandHistory(ch => ch.concat([trim]))
    connection.connection
      .writePacket(0x03, concatPacketData([trim]))
      .catch(createErrorHandler(colorMap.dark_red, addMessage, sendMessageErr))
  }

  if (!connection) return <></> // This should never be hit hopefully.
  const title =
    connection.serverName.length > 12
      ? connection.serverName.substring(0, 9) + '...'
      : connection.serverName
  const backButton = (
    <View style={styles.backButton}>
      <Ionicons.Button
        name='chevron-back-sharp'
        iconStyle={styles.backButtonIcon}
        backgroundColor='#363636'
        onPress={() => {
          settingsOpen ? setSettingsOpen(false) : navigation.goBack()
        }}
      />
    </View>
  )
  // TODO: Use stack navigation for this so the physical back button works correctly.
  if (settingsOpen) return <SettingScreen button={backButton} />
  return (
    <>
      <View style={darkMode ? globalStyle.darkHeader : globalStyle.header}>
        {backButton}
        <Text style={[globalStyle.title, styles.title]}>Chat - {title}</Text>
        <View style={globalStyle.flexSpacer} />
        <Ionicons.Button
          name='settings-outline'
          iconStyle={styles.backButtonIcon}
          backgroundColor='#363636'
          onPress={() => setSettingsOpen(true)}
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
      {loggedIn && (
        <>
          <ChatMessageListMemo messages={messages} darkMode={darkMode} />
          <View style={darkMode ? styles.textAreaDark : styles.textArea}>
            <TextField
              value={message}
              maxLength={charLimit}
              onChangeText={setMessage}
              style={styles.textField}
              onSubmitEditing={sendMessage}
              enablesReturnKeyAutomatically
              returnKeyType='send'
              blurOnSubmit={false}
              autoCorrect={!settings.disableAutoCorrect}
            />
            <Ionicons.Button
              name='ios-send-sharp'
              onPress={sendMessage}
              iconStyle={styles.sendButtonIcon}
              borderRadius={32}
            />
          </View>
        </>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  title: { textAlignVertical: 'center' },
  backButton: { marginRight: 8 },
  backButtonIcon: { marginRight: 0 },
  sendButtonIcon: { marginRight: 0, marginLeft: 4 },
  androidScaleInvert: {
    scaleY: Platform.OS === 'android' ? -1 : undefined
  },
  chatArea: { padding: 8, flex: 1, scaleY: -1 },
  chatAreaScrollView: { paddingBottom: 16 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingScreenText: { paddingTop: 24, fontSize: 20 },
  textAreaDark: {
    padding: 8,
    flexDirection: 'row',
    backgroundColor: '#242424'
  },
  textArea: { padding: 8, backgroundColor: '#fff', flexDirection: 'row' },
  textField: { marginTop: 0, flex: 1, marginRight: 8, borderRadius: 32 }
})

export default ChatScreen
