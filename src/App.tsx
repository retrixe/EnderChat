import React, { useEffect } from 'react'
import { useColorScheme, NativeModules, StatusBar, SafeAreaView, Platform } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'
import { NavigationContainer, DarkTheme, type ParamListBase } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import ErrorBoundary from 'react-native-error-boundary'

import useAsyncStorage from './utilities/storage/useAsyncStorage'
import useJsonAsyncStorage from './utilities/storage/useJsonAsyncStorage'
import ConnectionContext, { type DisconnectReason } from './context/connectionContext'
import AccountsContext, { type Accounts } from './context/accountsContext'
import SettingsContext, { defaultSettings, type Settings } from './context/settingsContext'
import ServersContext, { type Servers } from './context/serversContext'
import { ColorSchemeContext } from './context/useDarkMode'
import DisconnectDialog from './components/DisconnectDialog'
import type { ServerConnection } from './minecraft/connection'
import ChatScreen from './screens/ChatScreen'
import ServerScreen from './screens/ServerScreen'
import AccountScreen from './screens/AccountScreen'
import SettingScreen from './screens/SettingScreen'
import globalStyle from './globalStyle'

export interface RootStackParamList extends ParamListBase {
  Home: undefined
  Chat: { serverName: string; version: number }
}

const Stacks = createNativeStackNavigator<RootStackParamList, 'StackNavigator'>()
const Tabs = createMaterialTopTabNavigator<RootStackParamList>() // createBottomTabNavigator()

const HomeScreen = (): React.JSX.Element => {
  // type HomeProp = NativeStackNavigationProp<RootStackParamList, 'Home'>; props: { navigation: HomeProp }
  /* const { connection } = React.useContext(ConnectionContext)
  React.useEffect(() => {
    if (connection)
      navigation.push('Chat', { serverName: connection.options.serverName, version: connection.options.protocolVersion })
  }, [connection, navigation]) */

  return (
    <Tabs.Navigator
      tabBarPosition='bottom'
      screenOptions={({ route }) => ({
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBarIcon: ({ focused, color }) => {
          let Component = Ionicons
          let iconName = focused ? 'list-circle' : 'list'
          switch (route.name) {
            case 'Servers':
              break
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline'
              break
            case 'Accounts':
              Component = MaterialIcons
              iconName = 'switch-account'
              break
            default:
              break
          }
          return <Component name={iconName} size={24} color={color} />
        },
        tabBarLabelStyle: { marginBottom: 5, textTransform: 'uppercase' },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#a0a0a0',
        headerShown: false,
      })}
    >
      <Tabs.Screen name='Servers' component={ServerScreen} />
      <Tabs.Screen name='Accounts' component={AccountScreen} />
      <Tabs.Screen name='Settings' component={SettingScreen} />
    </Tabs.Navigator>
  )
}

interface NavBarColorModule {
  setNavigationBarColor: (color: string, light: boolean, animated: boolean) => void
}

const App = (): React.JSX.Element => {
  const [connection, setConnection] = React.useState<ServerConnection | undefined>()
  const [disconnect, setDisconnect] = React.useState<DisconnectReason | undefined>()

  const [settings, setSettings] = useJsonAsyncStorage<Settings>('@settings', defaultSettings, true)
  const [accountsStore, setAccountsStore] = useAsyncStorage('@accounts', '{}')
  const [serversStore, setServersStore] = useAsyncStorage('@servers', '{}')
  const accounts = JSON.parse(accountsStore) as Accounts
  const servers = JSON.parse(serversStore) as Servers
  const setAccounts = (newAccounts: Accounts): void => setAccountsStore(JSON.stringify(newAccounts))
  const setServers = (newServers: Servers): void => setServersStore(JSON.stringify(newServers))

  const colorScheme = useColorScheme()
  const systemDefault = colorScheme === null ? true : colorScheme === 'dark'
  const darkMode = settings.darkMode ?? systemDefault
  // Change navigation bar colour on dark mode.
  // LOW-TODO: Doesn't work correctly in modals.
  useEffect(() => {
    // iOS-TODO: Port NavBarColorModule to iOS.
    const { NavBarColorModule } = NativeModules as { NavBarColorModule?: NavBarColorModule }
    if (Platform.OS === 'android' && NavBarColorModule) {
      NavBarColorModule.setNavigationBarColor(darkMode ? '#121212' : '#ffffff', !darkMode, false)
    }
  }, [darkMode])

  return (
    <SafeAreaView style={globalStyle.flexSpacer}>
      <ConnectionContext.Provider
        value={{
          connection,
          setConnection,
          disconnectReason: disconnect,
          setDisconnectReason: setDisconnect,
        }}
      >
        <SettingsContext.Provider value={{ settings, setSettings }}>
          <ServersContext.Provider value={{ servers, setServers }}>
            <AccountsContext.Provider value={{ accounts, setAccounts }}>
              <ColorSchemeContext.Provider value={darkMode}>
                {disconnect && <DisconnectDialog />}
                <NavigationContainer theme={darkMode ? DarkTheme : undefined}>
                  <StatusBar
                    backgroundColor={darkMode ? '#242424' : '#ffffff'}
                    barStyle={darkMode ? 'light-content' : 'dark-content'}
                  />
                  <Stacks.Navigator
                    id='StackNavigator'
                    initialRouteName='Home'
                    screenOptions={{
                      headerShown: false,
                      animation: 'slide_from_right',
                    }}
                  >
                    <Stacks.Screen name='Home' component={HomeScreen} />
                    <Stacks.Screen
                      name='Chat'
                      component={ChatScreen}
                      getId={({ params: { serverName, version } }) => `${serverName}: ${version}`}
                    />
                    <Stacks.Screen name='Settings' component={SettingScreen} />
                  </Stacks.Navigator>
                </NavigationContainer>
              </ColorSchemeContext.Provider>
            </AccountsContext.Provider>
          </ServersContext.Provider>
        </SettingsContext.Provider>
      </ConnectionContext.Provider>
    </SafeAreaView>
  )
}

const AppWithErrorBoundary = (): React.JSX.Element => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)

export default AppWithErrorBoundary
