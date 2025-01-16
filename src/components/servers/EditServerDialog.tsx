import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Pressable } from 'react-native'
import { Picker } from '@react-native-picker/picker'

import globalStyle from '../../globalStyle'
import type { Servers } from '../../context/serversContext'
import Dialog, { dialogStyles } from '../Dialog'
import Text from '../Text'
import TextField from '../TextField'
import type { protocolMap } from '../../minecraft/utils'

const EditServerDialog = ({
  servers,
  darkMode,
  editServer,
  deleteServer,
  editServerDialogOpen,
  setEditServerDialogOpen,
}: {
  servers: Servers
  darkMode: boolean
  editServer: (serverName: string, version: keyof typeof protocolMap, address: string) => void
  deleteServer: (server: string) => void
  editServerDialogOpen: string | boolean
  setEditServerDialogOpen: (server: string | boolean) => void
}): React.JSX.Element => {
  const [ipAddr, setIpAddr] = useState('')
  const [ipAddrRed, setIpAddrRed] = useState(false)
  const [newServerName, setNewServerName] = useState('')
  const [serverNameRed, setServerNameRed] = useState(false)
  const [serverVersion, setServerVersion] = useState<keyof typeof protocolMap>('auto')

  const invalidServerName = newServerName.length > 32

  // Reset properties whenever dialog opens (could also happen when server changes, though, but this is unlikely).
  const server = typeof editServerDialogOpen === 'string' && servers[editServerDialogOpen]
  useEffect(() => {
    setIpAddrRed(false)
    setServerNameRed(false)
    if (server) {
      setNewServerName(editServerDialogOpen)
      setServerVersion(server.version)
      setIpAddr(server.address)
    } else {
      setNewServerName('')
      setServerVersion('auto')
      setIpAddr('')
    }
  }, [editServerDialogOpen, server])

  const closeDialog = (): void => setEditServerDialogOpen(false)

  const handleDeleteServer = (): void => {
    if (typeof editServerDialogOpen !== 'string') return
    deleteServer(editServerDialogOpen)
    closeDialog()
  }

  const handleEditServer = (): void => {
    const edit = typeof editServerDialogOpen === 'string'
    if (
      !newServerName ||
      invalidServerName ||
      (!edit && servers[newServerName]) ||
      (edit && servers[newServerName] && newServerName !== editServerDialogOpen)
    ) {
      return setServerNameRed(true)
    } else if (ipAddr === '') {
      return setIpAddrRed(true)
    }
    editServer(newServerName, serverVersion, ipAddr)
    closeDialog()
  }

  const modalButtonCancelText = darkMode
    ? dialogStyles.modalButtonCancelDarkText
    : dialogStyles.modalButtonCancelText

  return (
    <Dialog visible={!!editServerDialogOpen} onRequestClose={closeDialog}>
      <Text style={dialogStyles.modalTitle}>
        {typeof editServerDialogOpen === 'string' ? 'Edit' : 'Add'} Server
      </Text>
      <TextField
        red={serverNameRed || invalidServerName}
        value={newServerName}
        onChangeText={setNewServerName}
        placeholder='Server Name'
      />
      <TextField red={ipAddrRed} value={ipAddr} onChangeText={setIpAddr} placeholder='IP Address' />
      <Picker
        selectedValue={serverVersion}
        style={darkMode ? styles.addServerPickerDark : styles.addServerPicker}
        onValueChange={itemValue => setServerVersion(itemValue)}
        dropdownIconColor={darkMode ? '#ffffff' : '#000000'}
      >
        <Picker.Item label='Auto' value='auto' />
        <Picker.Item label='1.20.5/1.20.6 (WIP)' value='1.20.5' />
        <Picker.Item label='1.20.3/1.20.4 (WIP)' value='1.20.3' />
        <Picker.Item label='1.20.2 (WIP)' value='1.20.2' />
        <Picker.Item label='1.20/1.20.1 (WIP)' value='1.20' />
        <Picker.Item label='1.19.4 (WIP)' value='1.19.4' />
        <Picker.Item label='1.19.3 (WIP)' value='1.19.3' />
        <Picker.Item label='1.19.1/1.19.2 (WIP)' value='1.19.1' />
        <Picker.Item label='1.19 (WIP)' value='1.19' />
        <Picker.Item label='1.18.2' value='1.18.2' />
        <Picker.Item label='1.18/1.18.1' value='1.18' />
        <Picker.Item label='1.17.1' value='1.17.1' />
        <Picker.Item label='1.17' value='1.17' />
        <Picker.Item label='1.16.4/1.16.5' value='1.16.4' />
      </Picker>
      <View style={dialogStyles.modalButtons}>
        {typeof editServerDialogOpen === 'string' && (
          <Pressable
            onPress={handleDeleteServer}
            android_ripple={{ color: '#aaa' }}
            style={dialogStyles.modalButton}
          >
            <Text style={styles.deleteServerButtonText}>DELETE</Text>
          </Pressable>
        )}
        <View style={globalStyle.flexSpacer} />
        <Pressable
          onPress={closeDialog}
          android_ripple={{ color: '#aaa' }}
          style={dialogStyles.modalButton}
        >
          <Text style={modalButtonCancelText}>CANCEL</Text>
        </Pressable>
        <Pressable
          onPress={handleEditServer}
          android_ripple={{ color: '#aaa' }}
          style={dialogStyles.modalButton}
        >
          <Text style={dialogStyles.modalButtonText}>
            {typeof editServerDialogOpen === 'string' ? 'EDIT' : 'ADD'}
          </Text>
        </Pressable>
      </View>
    </Dialog>
  )
}

const styles = StyleSheet.create({
  addServerPickerDark: { color: '#ffffff' },
  addServerPicker: { color: '#000000' },
  deleteServerButtonText: { color: '#ff0000', fontWeight: 'bold' },
})

export default EditServerDialog
