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
  ClickEvent,
  ColorMap
} from '../minecraft/chatToJsx'
import { readVarInt, writeVarInt } from '../minecraft/utils'
import { concatPacketData } from '../minecraft/packet'
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

const renderItem = (
  colorMap: ColorMap,
  clickEventHandler: (ce: ClickEvent) => void
) => {
  const ItemRenderer = ({ item }: { item: Message }) => (
    <View style={styles.androidScaleInvert}>
      <ChatToJsx
        chat={item.text}
        component={Text}
        colorMap={colorMap}
        clickEventHandler={clickEventHandler}
      />
    </View>
  )
  return ItemRenderer // LOW-TODO: Performance implications?
} // https://reactnative.dev/docs/optimizing-flatlist-configuration
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

const enderChatPrefix = '\u00A74[\u00A7cEnderChat\u00A74] \u00A7c'
const sendMessageErr = 'Failed to send message to server!'
const parseMessageErr = 'An error occurred when parsing chat.'
const inventoryCloseErr = 'An error occurred when closing an inventory window.'
const respawnErr = 'An error occurred when trying to respawn after death.'
const deathRespawnMessage = enderChatPrefix + 'You died! Respawning...'
const healthMessage =
  enderChatPrefix + "You're losing health! \u00A7b%prev \u00A7f-> \u00A7c%new"
const errorHandler =
  (addMessage: (text: MinecraftChat) => void, translated: string) =>
  (error: unknown) => {
    console.error(error)
    addMessage(enderChatPrefix + translated)
  }

// TODO: Ability to copy text.
const ChatScreen = ({ navigation }: { navigation: ChatNavigationProp }) => {
  const darkMode = useDarkMode()
  const { settings } = useContext(SettingsContext)
  const { connection, setConnection } = useContext(ConnectionContext)
  // TODO: Show command history.
  const [, setCommandHistory] = useState<string[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [loggedIn, setLoggedIn] = useState(false)
  const [message, setMessage] = useState('')
  const loggedInRef = useRef(false)
  const idRef = useRef(0)

  const healthRef = useRef<number | null>(null)

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
  useEffect(() => {
    if (!connection) return
    connection.connection.on('packet', packet => {
      if (!loggedInRef.current && connection.connection.loggedIn) {
        setLoggedIn(true)
        loggedInRef.current = true
        if (settings.sendJoinMessage) {
          connection.connection
            .writePacket(
              0x03,
              concatPacketData([settings.joinMessage.substring(0, charLimit)])
            )
            .catch(errorHandler(addMessage, sendMessageErr))
        }
        if (settings.sendSpawnCommand) {
          connection.connection
            .writePacket(0x03, concatPacketData(['/spawn']))
            .catch(errorHandler(addMessage, sendMessageErr))
        }
      } else if (packet.id === 0x0f /* Chat Message (clientbound) */) {
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
          errorHandler(addMessage, parseMessageErr)(e)
        }
      } else if (packet.id === 0x2e /* Open Window */) {
        // Just close the window.
        const [windowId] = readVarInt(packet.data)
        const buf = Buffer.alloc(1)
        buf.writeUInt8(windowId)
        connection.connection // Close Window (serverbound)
          .writePacket(0x09, buf)
          .catch(errorHandler(addMessage, inventoryCloseErr))
      } else if (packet.id === 0x35 /* Death Combat Event */) {
        const [, playerIdLen] = readVarInt(packet.data)
        const offset = playerIdLen + 4 // Entity ID
        const [chatLen, chatVarIntLength] = readVarInt(packet.data, offset)
        const jsonOffset = offset + chatVarIntLength
        const deathMessage = parseValidJson(
          packet.data.slice(jsonOffset, jsonOffset + chatLen).toString('utf8')
        )
        addMessage(deathRespawnMessage)
        if (deathMessage?.text || deathMessage?.extra) addMessage(deathMessage)
        // Automatically respawn.
        // LOW-TODO: Should this be manual, or a dialog, like MC?
        connection.connection // Client Status
          .writePacket(0x04, writeVarInt(0))
          .catch(errorHandler(addMessage, respawnErr))
      } else if (packet.id === 0x52 /* Update Health */) {
        const newHealth = packet.data.readFloatBE(0)
        if (healthRef.current != null && healthRef.current > newHealth) {
          const info = healthMessage
            .replace('%prev', healthRef.current.toString())
            .replace('%new', newHealth.toString())
          addMessage(info)
        } // LOW-TODO: Long-term it would be better to have a UI.
        healthRef.current = newHealth
      }
    })
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
    connection.connection
      .writePacket(0x03, concatPacketData([msg]))
      .catch(errorHandler(addMessage, sendMessageErr))
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
