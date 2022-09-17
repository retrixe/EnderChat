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
import { getSession, createConnection } from './sessionBuilder'
import { RootStackParamList } from '../../App'
import globalStyle from '../../globalStyle'
import useDarkMode from '../../context/useDarkMode'
import AccountsContext from '../../context/accountsContext'
import ServersContext from '../../context/serversContext'
import useSessionStore from '../../context/sessionStore'
import SettingsContext from '../../context/settingsContext'
import ConnectionContext, {
  DisconnectReason
} from '../../context/connectionContext'
import {
  ChatToJsx,
  mojangColorMap,
  lightColorMap,
  MinecraftChat,
  ClickEvent,
  ColorMap
} from '../../minecraft/chatToJsx'
import { protocolMap, writeVarInt } from '../../minecraft/utils'
import { concatPacketData, PacketDataTypes } from '../../minecraft/packet'
import TextField from '../../components/TextField'
import Text from '../../components/Text'

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>

export type Status = 'OPENING' | 'CONNECTING' | 'CONNECTED' | 'CLOSED'

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
  const { servers } = useContext(ServersContext)
  const { accounts, setAccounts } = useContext(AccountsContext)
  const { connection, setConnection, setDisconnectReason } =
    useContext(ConnectionContext)
  const { sessions, setSession } = useSessionStore()

  // TODO: Show command history.
  const [, setCommandHistory] = useState<string[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState('Connecting to server...')
  const [message, setMessage] = useState('')

  const messagesBufferRef = useRef<Message[]>([])
  const healthRef = useRef<number | null>(null)
  const statusRef = useRef<Status>(connection ? 'CONNECTING' : 'OPENING')
  const idRef = useRef(0)

  const { version, serverName } = route.params
  const charLimit = version >= 306 /* 16w38a */ ? 256 : 100

  const addMessage = (text: MinecraftChat) =>
    messagesBufferRef.current.unshift({ key: idRef.current++, text })
  const closeChatScreen = (reason?: DisconnectReason) => {
    if (statusRef.current !== 'CLOSED') {
      if (navigation.canGoBack()) navigation.goBack()
      if (reason) setDisconnectReason(reason)
    }
  }

  // Chat message buffering function.
  useEffect(() => {
    const interval = setInterval(() => {
      if (messagesBufferRef.current.length) {
        setMessages(m => {
          const concat = messagesBufferRef.current.concat(m)
          messagesBufferRef.current = []
          return concat.length > 500 ? concat.slice(0, 499) : concat
        })
      }
    }, 50)
    return () => clearInterval(interval)
  }, [])

  // Screen cleanup function.
  useEffect(() =>
    navigation.addListener('beforeRemove', () => {
      statusRef.current = 'CLOSED'
      // Gracefully disconnect on unmount, destroy will be called in 20s automatically if needed.
      if (connection) {
        connection.connection.close()
        setConnection(undefined)
      }
    })
  )

  // Create connection useEffect.
  useEffect(() => {
    if (statusRef.current === 'OPENING') {
      statusRef.current = 'CONNECTING'
      ;(async () => {
        const session = await getSession(
          version,
          accounts,
          sessions,
          setSession,
          setLoading,
          setAccounts
        )
        if (typeof session === 'string') {
          closeChatScreen({ server: serverName, reason: session })
        } else if (statusRef.current !== 'CLOSED') {
          setLoading('Connecting to server...')
          const conn = await createConnection(
            serverName,
            version,
            servers,
            session,
            settings,
            accounts,
            setConnection,
            closeChatScreen
          )
          if ((statusRef.current as 'CLOSED' | 'CONNECTING') !== 'CLOSED') {
            if (typeof conn === 'string') {
              closeChatScreen({ server: serverName, reason: conn })
            } else {
              conn.connection.on('connect', () => setLoading('Logging in...'))
              setConnection(conn)
            }
          } else if (typeof conn !== 'string') conn.connection.close()
        }
      })().catch(err => {
        console.error(err)
        if (statusRef.current !== 'CLOSED') {
          const reason = 'An unknown error occurred!\n' + err
          closeChatScreen({ server: serverName, reason })
        }
      })
    }
  })

  // Packet handler useEffect.
  useEffect(() => {
    if (!connection) return
    connection.connection.on(
      'packet',
      packetHandler(
        healthRef,
        statusRef,
        setLoading,
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

  const sendMessage = (msg: string, saveHistory: boolean) => {
    if (!connection || !msg) return
    setMessage('')
    if (msg.startsWith('/') && saveHistory) {
      setCommandHistory(ch => ch.concat([msg]))
    }
    const is119 =
      connection.connection.options.protocolVersion >= protocolMap[1.19]
    const is1191 =
      connection.connection.options.protocolVersion >= protocolMap['1.19.1']
    if (!is119) {
      connection.connection
        .writePacket(0x03, concatPacketData([msg]))
        .catch(handleError(addMessage, sendMessageError))
    } else {
      const id = msg.startsWith('/')
        ? is1191
          ? 0x04
          : 0x03
        : is1191
        ? 0x05
        : 0x04
      const timestamp = Buffer.alloc(8)
      timestamp.writeIntBE(Date.now(), 2, 6) // writeBigInt64BE(BigInt(Date.now()))
      const salt = connection.connection.msgSalt ?? Buffer.alloc(8)
      // TODO-1.19: Send signature(s), preview chat, last seen messages and last received message if possible.
      const data: PacketDataTypes[] = [
        msg.startsWith('/') ? msg.substring(1) : msg,
        timestamp,
        salt,
        writeVarInt(0),
        false
      ]
      if (is1191) data.push(writeVarInt(0), writeVarInt(0))
      connection.connection
        .writePacket(id, concatPacketData(data))
        .catch(handleError(addMessage, sendMessageError))
    }
  }

  const title =
    route.params.serverName.length > 12
      ? route.params.serverName.substring(0, 9) + '...'
      : route.params.serverName

  return (
    <>
      <View style={darkMode ? globalStyle.darkHeader : globalStyle.header}>
        <View style={styles.backButton}>
          <Ionicons.Button
            name='chevron-back-sharp'
            iconStyle={styles.backButtonIcon}
            backgroundColor='#363636'
            onPress={() => closeChatScreen()}
          />
        </View>
        <Text style={[globalStyle.title, styles.title]}>Chat - {title}</Text>
        <View style={globalStyle.flexSpacer} />
        <Ionicons.Button
          name='settings-outline'
          iconStyle={styles.backButtonIcon}
          backgroundColor='#363636'
          onPress={() => navigation.push('Settings')}
        />
      </View>
      {(loading || !connection) && (
        <View style={styles.loadingScreen}>
          <ActivityIndicator
            color='#00aaff'
            size={Platform.select<number | 'large'>({
              android: 64,
              default: 'large'
            })}
          />
          <Text style={styles.loadingScreenText}>
            {loading || 'Connecting to server...'}
          </Text>
        </View>
      )}
      {!loading && connection && (
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
