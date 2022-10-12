import React, { useState } from 'react'
import { View, Pressable, StyleSheet, ViewProps } from 'react-native'

import Text from '../../components/Text'
import Dialog, { dialogStyles } from '../../components/Dialog'
import globalStyle from '../../globalStyle'
import useDarkMode from '../../context/useDarkMode'

const RadioButton = (props: { style?: ViewProps; selected: boolean }) => {
  const darkMode = useDarkMode()
  return (
    <View
      style={[
        radioButtonStyles.outerView,
        darkMode ? radioButtonStyles.outerViewDark : {},
        props.style
      ]}
    >
      {props.selected ? (
        <View
          style={[
            radioButtonStyles.innerView,
            darkMode ? radioButtonStyles.innerViewDark : {}
          ]}
        />
      ) : null}
    </View>
  )
}

const radioButtonStyles = StyleSheet.create({
  outerView: {
    margin: 8,
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center'
  },
  outerViewDark: { borderColor: '#fff' },
  innerViewDark: { backgroundColor: '#fff' },
  innerView: { height: 12, width: 12, borderRadius: 6, backgroundColor: '#000' }
})

interface DarkModeSettingProps {
  value: boolean | null
  setValue: (newValue: boolean | null) => void
}

const DarkModeSetting = ({ value, setValue }: DarkModeSettingProps) => {
  const [modalOpen, setModalOpen] = useState(false)
  const ripple = { color: '#aaa' }
  const dark = useDarkMode()
  const cancelStyle = dark
    ? dialogStyles.modalButtonCancelDarkText
    : dialogStyles.modalButtonCancelText
  return (
    <Pressable onPress={() => setModalOpen(true)} android_ripple={ripple}>
      <Dialog visible={modalOpen} onRequestClose={() => setModalOpen(false)}>
        <Text style={[dialogStyles.modalTitle, styles.dialogTitle]}>
          Dark mode
        </Text>
        <Pressable
          onPress={() => setValue(true)}
          android_ripple={ripple}
          style={styles.dialogOption}
        >
          <RadioButton selected={value === true} />
          <Text style={styles.settingItem}>Enabled</Text>
        </Pressable>
        <Pressable
          onPress={() => setValue(false)}
          android_ripple={ripple}
          style={styles.dialogOption}
        >
          <RadioButton selected={value === false} />
          <Text style={styles.settingItem}>Disabled</Text>
        </Pressable>
        <Pressable
          onPress={() => setValue(null)}
          android_ripple={ripple}
          style={styles.dialogOption}
        >
          <RadioButton selected={value === null} />
          <Text style={styles.settingItem}>Use system default</Text>
        </Pressable>
        <View style={dialogStyles.modalButtons}>
          <View style={globalStyle.flexSpacer} />
          <Pressable
            android_ripple={ripple}
            style={dialogStyles.modalButton}
            onPress={() => setModalOpen(false)}
          >
            <Text style={cancelStyle}>CLOSE</Text>
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
  dialogOption: { flexDirection: 'row' },
  settingItem: { fontSize: 18, width: '100%', padding: 8 },
  settingSubtext: { fontSize: 12, fontWeight: '400', color: '#666' },
  settingSubtextDark: { fontSize: 12, fontWeight: '400', color: '#aaa' }
})

export default DarkModeSetting
