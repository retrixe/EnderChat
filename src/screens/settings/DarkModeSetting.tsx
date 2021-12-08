import React, { useState } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'

import Text from '../../components/Text'
import Dialog, { dialogStyles } from '../../components/Dialog'
import globalStyle from '../../globalStyle'
import useDarkMode from '../../context/useDarkMode'

interface DarkModeSettingProps {
  value: boolean | null
  setValue: (newValue: boolean | null) => void
}

const DarkModeSetting = ({ value, setValue }: DarkModeSettingProps) => {
  const [modalOpen, setModalOpen] = useState(false)
  const save = (newValue: boolean | null) => {
    setValue(newValue)
    setModalOpen(false)
  }
  const ripple = { color: '#aaa' }
  const dark = useDarkMode()
  const cancelStyle = dark
    ? dialogStyles.modalButtonCancelDarkText
    : dialogStyles.modalButtonCancelText
  return (
    // LOW-TODO: Should have radio buttons.
    <Pressable onPress={() => setModalOpen(true)} android_ripple={ripple}>
      <Dialog visible={modalOpen} onRequestClose={() => setModalOpen(false)}>
        <Text style={[dialogStyles.modalTitle, styles.dialogTitle]}>
          Dark mode
        </Text>
        <Pressable onPress={() => save(true)} android_ripple={ripple}>
          <Text style={styles.settingItem}>Enabled</Text>
        </Pressable>
        <Pressable onPress={() => save(false)} android_ripple={ripple}>
          <Text style={styles.settingItem}>Disabled</Text>
        </Pressable>
        <Pressable onPress={() => save(null)} android_ripple={ripple}>
          <Text style={styles.settingItem}>Use system default</Text>
        </Pressable>
        <View style={dialogStyles.modalButtons}>
          <View style={globalStyle.flexSpacer} />
          <Pressable
            android_ripple={ripple}
            style={dialogStyles.modalButton}
            onPress={() => setModalOpen(false)}
          >
            <Text style={cancelStyle}>CANCEL</Text>
          </Pressable>
        </View>
      </Dialog>
      <View style={styles.setting}>
        <Text style={styles.settingText}>Dark mode</Text>
        <Text style={dark ? styles.settingSubtextDark : styles.settingSubtext}>
          {value === null ? 'System default' : value ? 'Enabled' : 'Disabled'}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  setting: { padding: 12, paddingLeft: 22, paddingRight: 22 },
  settingText: { fontSize: 18 },
  dialogTitle: { marginBottom: 12 },
  settingItem: { fontSize: 18, width: '100%', padding: 8 },
  settingSubtext: { fontSize: 12, fontWeight: '400', color: '#666' },
  settingSubtextDark: { fontSize: 12, fontWeight: '400', color: '#aaa' }
})

export default DarkModeSetting
