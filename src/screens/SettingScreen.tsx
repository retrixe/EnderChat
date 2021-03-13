import React, { useContext } from 'react'
import { Text, View } from 'react-native'

import { version } from '../../package.json'
import Setting from '../components/Setting'
import globalStyle from '../globalStyle'
import SettingsContext from '../context/settingsContext'

const SettingScreen = () => {
  const { settings, setSettings } = useContext(SettingsContext)

  return (
    <>
      <View style={globalStyle.header}>
        <Text style={globalStyle.title}>Settings</Text>
      </View>
      <View>
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
        <Setting
          name='Dark mode'
          value={settings.darkMode}
          setValue={darkMode => setSettings({ darkMode })}
        />
        {/* TODO: Font Size, Chat Theme, Feedback/Support, Privacy Policy */}
        <Setting name='Version' value={version} />
      </View>
    </>
  )
}

export default SettingScreen
