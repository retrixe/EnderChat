import React, { useContext, useEffect } from 'react'
import { Text, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'

import globalStyle from '../globalStyle'
import ConnectionContext from '../context/connectionContext'

type ChatNavigationProp = StackNavigationProp<
  { Home: undefined; Chat: undefined },
  'Chat'
>

const ChatScreen = ({ navigation }: { navigation: ChatNavigationProp }) => {
  const { connection, setConnection } = useContext(ConnectionContext)
  useEffect(() => {
    if (!connection) {
      navigation.goBack() // Safety net.
      return
    }
    return () => setConnection(undefined)
  }, [connection, setConnection, navigation])

  return (
    <>
      <View style={globalStyle.header}>
        <Text style={globalStyle.title}>Chat</Text>
        <View style={globalStyle.flexSpacer} />
      </View>
    </>
  )
}

export default ChatScreen
