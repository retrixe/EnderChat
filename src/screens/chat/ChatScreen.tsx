import React, { useContext, useEffect, useRef, useState } from 'react'
import {
  FlatList,
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
  Linking,
  Clipboard
} from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import {
  packetHandler,
  enderChatPrefix,
  sendMessageError
} from './packetHandler'
import globalStyle from '../../globalStyle'
import useDarkMode from '../../context/useDarkMode'
import SettingsContext from '../../context/settingsContext'
import ConnectionContext from '../../context/connectionContext'
import {
  ChatToJsx,
  mojangColorMap,
  lightColorMap,
  MinecraftChat,
  ClickEvent,
  ColorMap
} from '../../minecraft/chatToJsx'
import { protocolMap, writeVarInt } from '../../minecraft/utils'
import { concatPacketData } from '../../minecraft/packet'
import TextField from '../../components/TextField'
import Text from '../../components/Text'
import SettingScreen from '../settings/SettingScreen'

interface RootStackParamList {
  [index: string]: any
  Home: undefined
  Chat: { serverName: string; version: number }
}
type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>

interface Message {
  key: number
  text: MinecraftChat
}

const renderItem = (colorMap: ColorMap, handleCe: (ce: ClickEvent) => void) => {
  const ItemRenderer = ({ item }: { item: Message }) => (
    <View style={styles.androidScaleInvert}>
      <ChatToJsx
        chat={item.text}
        component={Text}
        colorMap={colorMap}
        clickEventHandler={handleCe}
      />
    </View>
  )
  // LOW-TODO: Performance implications? https://reactnative.dev/docs/optimizing-flatlist-configuration
  return ItemRenderer
}
const ChatMessageList = (props: {
  messages: Message[]
  colorMap: ColorMap
  clickEventHandler: (ce: ClickEvent) => void
}) => {
  return (
    <FlatList
      inverted={Platform.OS !== 'android'}
      data={props.messages}
      style={[styles.androidScaleInvert, styles.chatArea]}
      contentContainerStyle={styles.chatAreaScrollView}
      renderItem={renderItem(props.colorMap, props.clickEventHandler)}
    />
  )
}
const ChatMessageListMemo = React.memo(ChatMessageList) // Shallow prop compare.

const handleError =
  (addMessage: (text: MinecraftChat) => void, translated: string) =>
  (error: unknown) => {
    console.error(error)
    addMessage(enderChatPrefix + translated)
  }

// TODO: Ability to copy text.
const ChatScreen = ({ navigation, route }: Props) => {
  const darkMode = useDarkMode()
  const { settings } = useContext(SettingsContext)
  const { connection, setConnection } = useContext(ConnectionContext)
  // TODO: Show command history.
  const [, setCommandHistory] = useState<string[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [loggedIn, setLoggedIn] = useState(false)
  const [message, setMessage] = useState('')
  const idRef = useRef(0)

  const charLimit =
    connection && connection.connection.options.protocolVersion >= 306 // 16w38a
      ? 256
      : 100
  const addMessage = (text: MinecraftChat) =>
    setMessages(m => {
      const trunc = m.length > 500 ? m.slice(0, 499) : m
      return [{ key: idRef.current++, text }].concat(trunc)
    })

  // Packet handler useEffect.
  const loggedInRef = useRef(false)
  const healthRef = useRef<number | null>(null)
  useEffect(() => {
    if (!connection) return
    connection.connection.on(
      'packet',
      packetHandler(
        healthRef,
        loggedInRef,
        setLoggedIn,
        connection.connection,
        addMessage,
        settings.joinMessage,
        settings.sendJoinMessage,
        settings.sendSpawnCommand,
        handleError,
        charLimit
      )
    )
    return () => {
      connection.connection.removeAllListeners('packet')
    }
  }, [
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

  const sendMessage = (msg: string, saveHistory: boolean) => {
    if (!connection || !msg) return
    setMessage('')
    if (msg.startsWith('/') && saveHistory) {
      setCommandHistory(ch => ch.concat([msg]))
    }
    if (connection.connection.options.protocolVersion < protocolMap['1.19']) {
      connection.connection
        .writePacket(0x03, concatPacketData([msg]))
        .catch(handleError(addMessage, sendMessageError))
    } else {
      const timestamp = Buffer.alloc(8)
      connection.connection
        .writePacket(
          0x04,
          concatPacketData([msg, timestamp, writeVarInt(0), false])
        )
        .catch(handleError(addMessage, sendMessageError))
      // TODO-1.19: Support sending Chat Command/Chat Message/Chat Preview.
    }
  }

  if (!connection) return <></> // This should never be hit hopefully.
  const title =
    route.params.serverName.length > 12
      ? route.params.serverName.substring(0, 9) + '...'
      : route.params.serverName
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
          <ChatMessageListMemo
            messages={messages}
            colorMap={darkMode ? mojangColorMap : lightColorMap}
            clickEventHandler={async ce => {
              // TODO: URL prompt support.
              if (
                ce.action === 'open_url' &&
                settings.webLinks &&
                (ce.value.startsWith('https://') ||
                  ce.value.startsWith('http://'))
              ) {
                await Linking.openURL(ce.value)
              } else if (ce.action === 'copy_to_clipboard') {
                Clipboard.setString(ce.value)
              } else if (ce.action === 'run_command') {
                // TODO: This should be a prompt - sendMessage(ce.value, false)
                setMessage(ce.value)
              } else if (ce.action === 'suggest_command') {
                setMessage(ce.value)
              } // No open_file/change_page handling.
            }}
          />
          <View style={darkMode ? styles.textAreaDark : styles.textArea}>
            <TextField
              value={message}
              maxLength={charLimit}
              onChangeText={setMessage}
              style={styles.textField}
              onSubmitEditing={() => sendMessage(message.trim(), true)}
              enablesReturnKeyAutomatically
              returnKeyType='send'
              blurOnSubmit={false}
              autoCorrect={!settings.disableAutoCorrect}
            />
            <Ionicons.Button
              name='ios-send-sharp'
              onPress={() => sendMessage(message.trim(), true)}
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
  androidScaleInvert: { scaleY: Platform.OS === 'android' ? -1 : undefined },
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
