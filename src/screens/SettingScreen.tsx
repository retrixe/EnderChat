import React, { useContext } from 'react'
import { View, ScrollView, Linking, StyleSheet } from 'react-native'
import type { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { version } from '../../package.json'
import type { RootStackParamList } from '../App'
import Text from '../components/Text'
import Setting from '../components/settings/Setting'
import DarkModeSetting from '../components/settings/DarkModeSetting'
import globalStyle from '../globalStyle'
import useDarkMode from '../context/useDarkMode'
import SettingsContext from '../context/settingsContext'

type StackProps = NativeStackScreenProps<RootStackParamList, 'Settings'>
type TabProps = MaterialTopTabScreenProps<RootStackParamList, 'Settings'>

const SettingScreen = ({ navigation }: StackProps | TabProps): React.JSX.Element => {
  const darkModeApp = useDarkMode()
  const { settings, setSettings } = useContext(SettingsContext)

  // TODO: Setting to disable autocomplete.
  return (
    <>
      <View style={darkModeApp ? globalStyle.darkHeader : globalStyle.header}>
        {navigation.getId() === 'StackNavigator' && (
          <View style={styles.backButton}>
            <Ionicons.Button
              name='chevron-back-sharp'
              iconStyle={styles.backButtonIcon}
              backgroundColor='#363636'
              onPress={() => navigation.goBack()}
            />
          </View>
        )}
        <Text style={globalStyle.title}>Settings</Text>
      </View>
      <ScrollView>
        {/* <Text>Hermes in use: {(global as any).HermesInternal ? 'true' : 'false'}</Text> */}
        <DarkModeSetting
          value={settings.darkMode}
          setValue={darkMode => setSettings({ darkMode })}
        />
        <Setting
          multiline
          maxLength={256}
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
          name='Enable clicking web links'
          value={settings.webLinks}
          setValue={webLinks => setSettings({ webLinks })}
        />
        {/* <Setting
          name='Prompt on opening links'
          value={settings.linkPrompt}
          setValue={linkPrompt => setSettings({ linkPrompt })}
        /> */}
        <Setting
          name='Enable 1.19 chat signing'
          value={settings.enableChatSigning}
          setValue={enableChatSigning => setSettings({ enableChatSigning })}
        />
        <Setting
          name='Disable auto-correct in chat'
          value={settings.disableAutoCorrect}
          setValue={disableAutoCorrect => setSettings({ disableAutoCorrect })}
        />
        {/* TODO: Text Font, Font Size, Chat Theme */}
        <Setting
          name='Version'
          value={version}
          onClick={() => {
            const url = `https://github.com/retrixe/EnderChat/releases/${version}`
            Linking.openURL(url).catch(console.error)
          }}
        />
        <Setting
          name='Feedback/Support'
          value='Tap to open the GitHub Issues page, or join our Discord!'
          onClick={() => {
            const url = 'https://github.com/retrixe/EnderChat/issues'
            Linking.openURL(url).catch(console.error)
          }}
        />
        <Setting
          name='Discord Server'
          value='Tap to open the Discord server invite.'
          onClick={() => {
            const url = 'https://discord.gg/MFSJa9TpPS'
            Linking.openURL(url).catch(console.error)
          }}
        />
        <Setting
          name='Sponsor my work, buy me a coffee!'
          value='Tap to open my GitHub Sponsor page.'
          onClick={() => {
            const url = 'https://github.com/sponsors/retrixe'
            Linking.openURL(url).catch(console.error)
          }}
        />
        <Setting
          name='License'
          value='Mozilla Public License 2.0'
          onClick={() => {
            const url = 'https://www.mozilla.org/en-US/MPL/2.0/'
            Linking.openURL(url).catch(console.error)
          }}
        />
        <Setting
          name='Privacy Policy'
          value='Tap to open the privacy policy in your browser.'
          onClick={() => {
            const url = 'https://github.com/retrixe/EnderChat#privacy-policy'
            Linking.openURL(url).catch(console.error)
          }}
        />
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  backButton: { marginRight: 8 },
  backButtonIcon: { marginRight: 0 },
})

export default SettingScreen
