import React, { useContext, useState } from 'react'
import { View, ScrollView, Pressable, StyleSheet, Linking } from 'react-native'

import { version } from '../../package.json'
import Text from '../components/Text'
import Dialog, { dialogStyles } from '../components/Dialog'
import Setting from '../components/Setting'
import globalStyle from '../globalStyle'
import useDarkMode from '../context/useDarkMode'
import SettingsContext from '../context/settingsContext'

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
  const cancelStyle = useDarkMode()
    ? dialogStyles.modalButtonCancelDarkText
    : dialogStyles.modalButtonCancelText
  return (
    <Pressable onPress={() => setModalOpen(true)} android_ripple={ripple}>
      <Dialog visible={modalOpen} onRequestClose={() => setModalOpen(false)}>
        <Text style={[dialogStyles.modalTitle, styles.dialogTitle]}>
          Dark mode (beta)
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
        <Text style={styles.settingText}>Dark mode (beta)</Text>
        <Text style={value ? styles.settingSubtextDark : styles.settingSubtext}>
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
  settingSubtext: { fontSize: 12, fontWeight: '100', color: '#666' },
  settingSubtextDark: { fontSize: 12, fontWeight: '100', color: '#aaa' }
})

const SettingScreen = () => {
  const darkModeApp = useDarkMode()
  const { settings, setSettings } = useContext(SettingsContext)

  return (
    <>
      <View style={darkModeApp ? globalStyle.darkHeader : globalStyle.header}>
        <Text style={globalStyle.title}>Settings</Text>
      </View>
      <ScrollView>
        {/* <Text>Hermes in use: {(global as any).HermesInternal ? 'true' : 'false'}</Text> */}
        <Setting
          multiline
          name='Join message'
          value={settings.joinMessage}
          setValue={joinMessage => setSettings({ joinMessage })}
        />
        <Setting
          name='Send join message'
          value={settings.sendJoinMessage}
          setValue={sendJoinMessage => setSettings({ sendJoinMessage })}
        />
        <Setting
          name='Send /spawn command'
          value={settings.sendSpawnCommand}
          setValue={sendSpawnCommand => setSettings({ sendSpawnCommand })}
        />
        <Setting
          name='Enable web links'
          value={settings.webLinks}
          setValue={webLinks => setSettings({ webLinks })}
        />
        <Setting
          name='Prompt on link click'
          value={settings.linkPrompt}
          setValue={linkPrompt => setSettings({ linkPrompt })}
        />
        <DarkModeSetting
          value={settings.darkMode}
          setValue={darkMode => setSettings({ darkMode })}
        />
        {/* TODO: Font Size, Chat Theme, Feedback/Support */}
        <Setting name='Version' value={version} />
        <Setting
          name='Privacy Policy'
          value='EnderChat does not collect any data. Analytics may be added later.'
        />
        <Setting
          name='License'
          value='Mozilla Public License 2.0'
          onClick={async () => {
            await Linking.openURL('https://www.mozilla.org/en-US/MPL/2.0/')
          }}
        />
      </ScrollView>
    </>
  )
}

export default SettingScreen
