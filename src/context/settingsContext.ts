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
  disableAutoCorrect: boolean
  darkMode: boolean | null
}

export const defaultSettings: Settings = {
  // TODO: Better defaults and settings.
  joinMessage:
    "I'm using EnderChat, a well-built, ad-free ChatCraft alternative! Even this message can be disabled!",
  sendJoinMessage: true,
  sendSpawnCommand: true,
  chatTheme: 'Colorless',
  fontSize: 16,
  webLinks: true,
  darkMode: null,
  linkPrompt: true,
  disableAutoCorrect: false
}

export interface SettingsContext {
  settings: Settings
  setSettings: (newSettings: Partial<Settings>) => void
}

const settingsContext = React.createContext<SettingsContext>({
  settings: defaultSettings,
  setSettings: () => {}
})

export default settingsContext
