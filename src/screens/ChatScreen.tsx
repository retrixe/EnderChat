import React, { useContext, useEffect, useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { StackNavigationProp } from '@react-navigation/stack'

import globalStyle from '../globalStyle'
import useDarkMode from '../context/useDarkMode'
import ConnectionContext from '../context/connectionContext'
import TextField from '../components/TextField'
import Text from '../components/Text'

type ChatNavigationProp = StackNavigationProp<
  { Home: undefined; Chat: undefined },
  'Chat'
>

const placeholderText: Array<{ key: number; text: string }> = []
for (let i = 0; i < 150; i++) {
  placeholderText.push({
    key: Math.random(),
    text: 'Lorem ipsum dolor sit amet.'
  })
}

// TODO: Proper functionality.
const ChatScreen = ({ navigation }: { navigation: ChatNavigationProp }) => {
  const darkMode = useDarkMode()
  const { connection, setConnection } = useContext(ConnectionContext)
  useEffect(() => {
    if (!connection) {
      navigation.goBack() // Safety net.
      return
    }
    return () => setConnection(undefined)
  }, [connection, setConnection, navigation])

  const [message, setMessage] = useState('')

  if (!connection) return <></> // This should never be hit hopefully.
  return (
    <>
      <View style={darkMode ? globalStyle.darkHeader : globalStyle.header}>
        {/* TODO: Could look better, but okay for now. Also breaks on long titles. */}
        <Ionicons.Button
          name='chevron-back-sharp'
          iconStyle={styles.backButtonIcon}
          backgroundColor='#363636'
        />
        <Text style={[globalStyle.title, styles.headerTitle]}>
          Chat - {connection.serverName}
        </Text>
        <View style={globalStyle.flexSpacer} />
        <Ionicons.Button
          name='settings-outline'
          iconStyle={styles.backButtonIcon}
          backgroundColor='#363636'
        />
      </View>
      <FlatList
        inverted
        data={placeholderText}
        style={styles.chatArea}
        contentContainerStyle={styles.chatAreaScrollView}
        renderItem={({ item }) => <Text>{item.text}</Text>}
      />
      <View style={darkMode ? styles.textAreaDark : styles.textArea}>
        <TextField
          value={message}
          onChangeText={setMessage}
          style={styles.textField}
        />
        <Ionicons.Button name='ios-send-sharp'>Send</Ionicons.Button>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  headerTitle: { marginLeft: 8 },
  backButtonIcon: { marginRight: 0 },
  chatArea: { padding: 8, flex: 1 },
  chatAreaScrollView: { paddingBottom: 16 },
  textAreaDark: {
    padding: 8,
    flexDirection: 'row',
    backgroundColor: '#242424'
  },
  textArea: { padding: 8, backgroundColor: '#fff', flexDirection: 'row' },
  textField: { marginTop: 0, flex: 1, marginRight: 8 }
})

export default ChatScreen
