import React, { useContext } from 'react'
import { StyleSheet, View, Pressable } from 'react-native'
import ConnectionContext from '../context/connectionContext'
import useDarkMode from '../context/useDarkMode'
import globalStyle from '../globalStyle'
import { ChatToJsx, lightColorMap, mojangColorMap } from '../minecraft/chatToJsx'
import Dialog, { dialogStyles } from './Dialog'
import Text from './Text'

const DisconnectDialog = (): JSX.Element => {
  const darkMode = useDarkMode()
  const { disconnectReason, setDisconnectReason } = useContext(ConnectionContext)

  if (!disconnectReason) return <></>
  return (
    <Dialog visible onRequestClose={() => setDisconnectReason()}>
      <Text style={dialogStyles.modalTitle}>Disconnected from {disconnectReason.server}</Text>
      <ChatToJsx
        chat={disconnectReason.reason}
        component={Text}
        colorMap={darkMode ? mojangColorMap : lightColorMap}
        componentProps={{ style: styles.disconnectReason }}
      />
      <View style={dialogStyles.modalButtons}>
        <View style={globalStyle.flexSpacer} />
        <Pressable
          onPress={() => setDisconnectReason()}
          android_ripple={{ color: '#aaa' }}
          style={dialogStyles.modalButton}
        >
          <Text style={dialogStyles.modalButtonText}>CLOSE</Text>
        </Pressable>
      </View>
    </Dialog>
  )
}

const styles = StyleSheet.create({
  disconnectReason: { fontSize: 14 },
})

export default DisconnectDialog
