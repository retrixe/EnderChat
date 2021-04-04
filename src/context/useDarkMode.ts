import { useContext } from 'react'
import { useColorScheme } from 'react-native'
import SettingsContext from '../context/settingsContext'

const useDarkMode = () => {
  const colorScheme = useColorScheme()
  const { settings } = useContext(SettingsContext)
  const systemDefault = colorScheme === null ? true : colorScheme === 'dark'
  return settings.darkMode === null ? systemDefault : settings.darkMode
}

export default useDarkMode
