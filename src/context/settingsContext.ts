import React from 'react'

export interface Settings {
  joinMessage: string
  sendJoinMessage: boolean
  sendSpawnCommand: boolean
  // chatTheme: 'Colorless', fontSize: number
  webLinks: boolean
  // linkPrompt: boolean
  disableAutoCorrect: boolean
  enableChatSigning: boolean
  darkMode: boolean | null
}

export const defaultSettings: Settings = {
  // TODO: Add chatTheme, fontSize, webLinks and linkPrompt. The last two are questionable.
  joinMessage:
    "I'm using EnderChat, a well-built, ad-free ChatCraft alternative! Even this message can be disabled!",
  sendJoinMessage: false,
  sendSpawnCommand: true,
  // chatTheme: 'Colorless', fontSize: 16,
  darkMode: null,
  webLinks: true,
  // linkPrompt: true,
  disableAutoCorrect: false,
  enableChatSigning: true,
}

export interface SettingsContext {
  settings: Settings
  setSettings: (newSettings: Partial<Settings>) => void
}

const settingsContext = React.createContext<SettingsContext>({
  settings: defaultSettings,
  setSettings: () => {},
})

export default settingsContext
