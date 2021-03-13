// Consider using Recoil instead of Context?
import React from 'react'

export interface Settings {
  joinMessage: string
  sendJoinMessage: boolean
  sendSpawnCommand: boolean
  chatTheme: 'Colorless'
  fontSize: number
  webLinks: boolean
  linkPrompt: boolean
  darkMode: boolean
}

export interface SettingsContext {
  settings: Settings
  setSettings: (newSettings: Partial<Settings>) => void
}

const settingsContext = React.createContext<SettingsContext>({
  settings: {
    joinMessage: '',
    sendJoinMessage: false,
    sendSpawnCommand: false,
    chatTheme: 'Colorless',
    fontSize: 16,
    webLinks: true,
    darkMode: false,
    linkPrompt: true
  },
  setSettings: () => {}
})

export default settingsContext
