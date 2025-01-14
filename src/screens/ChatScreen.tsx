import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { StyleSheet, View, ActivityIndicator, Platform, Linking } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import {
  packetHandler,
  enderChatPrefix,
  sendMessageError,
} from '../utilities/connection/packetHandler'
import { getSession, createConnection } from '../utilities/connection/connectionBuilder'
import type { RootStackParamList } from '../App'
import globalStyle from '../globalStyle'
import useDarkMode from '../context/useDarkMode'
import AccountsContext from '../context/accountsContext'
import ServersContext from '../context/serversContext'
import useSessionStore from '../context/sessionStore'
import SettingsContext from '../context/settingsContext'
import ConnectionContext, { type DisconnectReason } from '../context/connectionContext'
import {
  mojangColorMap,
  lightColorMap,
  type MinecraftChat,
  type ClickEvent,
} from '../minecraft/chatToJsx'
import { ConnectionState } from '../minecraft/connection'
import { makeChatMessagePacket } from '../minecraft/packets/chat'
import TextField from '../components/TextField'
import Text from '../components/Text'
import ActionBar from '../components/chat/ActionBar'
import ChatMessageList, { type Message } from '../components/chat/ChatMessageList'

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>

export type Status = 'CONNECTING' | 'CONNECTED' | 'CLOSED'
const handleError =
  (addMessage: (text: MinecraftChat) => void, translated: string) => (error: unknown) => {
    console.error(error)
    addMessage(enderChatPrefix + translated)
  }

// TODO: Ability to copy text.
const ChatScreen = ({ navigation, route }: Props): JSX.Element => {
  const darkMode = useDarkMode()
  const { settings } = useContext(SettingsContext)
  const { servers } = useContext(ServersContext)
  const { accounts, setAccounts } = useContext(AccountsContext)
  const { connection, setConnection, setDisconnectReason } = useContext(ConnectionContext)
  const { sessions, setSession } = useSessionStore()

  // TODO: Show command history.
  const [, setCommandHistory] = useState<string[]>([])
  const [actionBar, setActionBar] = useState<MinecraftChat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState('Connecting to server...')
  const [message, setMessage] = useState('')

  const performedInitialActionsRef = useRef(false)
  const messagesBufferRef = useRef<Message[]>([])
  const actionBarRef = useRef<NodeJS.Timeout | null>(null)
  const healthRef = useRef<number | null>(null)
  const statusRef = useRef<Status>(connection ? 'CONNECTED' : 'CONNECTING')
  const idRef = useRef(0)

  const { version, serverName } = route.params
  const charLimit = version >= 306 /* 16w38a */ ? 256 : 100

  const addMessage = (text: MinecraftChat): number =>
    messagesBufferRef.current.unshift({ key: idRef.current++, text })

  const setActionBarWithTimeout = (text: MinecraftChat): void => {
    setActionBar(text)
    if (actionBarRef.current) clearTimeout(actionBarRef.current)
    actionBarRef.current = setTimeout(() => {
      setActionBar(null)
      actionBarRef.current = null
    }, 3000)
  }

  const closeChatScreen = (reason?: DisconnectReason): void => {
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
        connection.close()
        setConnection(undefined)
      }
    }),
  )

  // Create connection useEffect.
  useEffect(() => {
    if (statusRef.current === 'CONNECTING') {
      statusRef.current = 'CONNECTED'
      ;(async () => {
        const session = await getSession(
          version,
          accounts,
          sessions,
          setSession,
          setLoading,
          setAccounts,
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
            closeChatScreen,
          )
          if ((statusRef.current as Status) !== 'CLOSED') {
            if (typeof conn === 'string') {
              closeChatScreen({ server: serverName, reason: conn })
            } else {
              conn.on('connect', () => setLoading('Logging in...'))
              setConnection(conn)
            }
          } else if (typeof conn !== 'string') conn.close()
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
    connection.on(
      'packet',
      packetHandler(
        performedInitialActionsRef,
        healthRef,
        setLoading,
        connection,
        addMessage,
        setActionBarWithTimeout,
        settings.joinMessage,
        settings.sendJoinMessage,
        settings.sendSpawnCommand,
        handleError,
        charLimit,
      ),
    )
    return () => {
      connection.removeAllListeners('packet')
    }
  }, [
    charLimit,
    connection,
    settings.joinMessage,
    settings.sendJoinMessage,
    settings.sendSpawnCommand,
  ])

  const sendMessage = (msg: string, saveHistory: boolean): void => {
    if (!connection || !msg || connection.state !== ConnectionState.PLAY) return
    setMessage('')
    if (msg.startsWith('/') && saveHistory) {
      setCommandHistory(ch => ch.concat([msg]))
    }
    const protocolVersion = connection.options.protocolVersion
    connection
      .writePacket(...makeChatMessagePacket(msg, protocolVersion))
      .catch(handleError(addMessage, sendMessageError))
  }

  const handleClickEvent = useCallback(
    (ce: ClickEvent) => {
      // TODO: URL prompt support.
      if (
        ce.action === 'open_url' &&
        settings.webLinks &&
        (ce.value.startsWith('https://') || ce.value.startsWith('http://'))
      ) {
        Linking.openURL(ce.value).catch(() => addMessage(enderChatPrefix + 'Failed to open URL!'))
      } else if (ce.action === 'copy_to_clipboard') {
        Clipboard.setString(ce.value)
      } else if (ce.action === 'run_command') {
        // TODO: This should be a prompt - sendMessage(ce.value, false)
        setMessage(ce.value)
      } else if (ce.action === 'suggest_command') {
        setMessage(ce.value)
      } // No open_file/change_page handling.
    },
    [settings.webLinks],
  )

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
              default: 'large',
            })}
          />
          <Text style={styles.loadingScreenText}>{loading || 'Connecting to server...'}</Text>
        </View>
      )}
      {!loading && connection && (
        <>
          {actionBar && (
            <ActionBar
              content={actionBar}
              colorMap={darkMode ? mojangColorMap : lightColorMap}
              onClickEvent={handleClickEvent}
            />
          )}
          <ChatMessageList
            messages={messages}
            colorMap={darkMode ? mojangColorMap : lightColorMap}
            onClickEvent={handleClickEvent}
          />
          <View style={darkMode ? styles.textAreaDark : styles.textArea}>
            <TextField
              placeholder='Message'
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
              name='send-sharp'
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
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingScreenText: { paddingTop: 24, fontSize: 20 },
  textAreaDark: {
    padding: 8,
    flexDirection: 'row',
    backgroundColor: '#242424',
  },
  textArea: { padding: 8, backgroundColor: '#fff', flexDirection: 'row' },
  textField: {
    marginTop: 0,
    flex: 1,
    marginRight: 8,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 32,
  },
})

export default ChatScreen
