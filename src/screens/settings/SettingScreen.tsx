import React, { useContext } from 'react'
import { View, ScrollView, Linking } from 'react-native'

import { version } from '../../../package.json'
import Text from '../../components/Text'
import Setting from '../../components/Setting'
import globalStyle from '../../globalStyle'
import useDarkMode from '../../context/useDarkMode'
import SettingsContext from '../../context/settingsContext'
import DarkModeSetting from './DarkModeSetting'

const SettingScreen = (props: { button?: JSX.Element }) => {
  const darkModeApp = useDarkMode()
  const { settings, setSettings } = useContext(SettingsContext)

  // TODO: Setting to disable autocomplete.
  return (
    <>
      <View style={darkModeApp ? globalStyle.darkHeader : globalStyle.header}>
        {props.button ?? false}
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
        <Setting
          name='Prompt on opening links'
          value={settings.linkPrompt}
          setValue={linkPrompt => setSettings({ linkPrompt })}
        />
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
        {/* TODO: Text Font, Font Size, Chat Theme, Feedback/Support */}
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
