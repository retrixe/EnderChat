import React, { useEffect } from 'react'
import {
  useColorScheme,
  NativeModules,
  StatusBar,
  SafeAreaView,
  Platform
} from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'
import { NavigationContainer, DarkTheme } from '@react-navigation/native'
import {
  createNativeStackNavigator,
  NativeStackNavigationProp
} from '@react-navigation/native-stack'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'

import useAsyncStorage from './storage/useAsyncStorage'
import useJsonAsyncStorage from './storage/useJsonAsyncStorage'
import ConnectionContext, {
  Connection,
  DisconnectReason as Disconnect
} from './context/connectionContext'
import AccountsContext, { Accounts } from './context/accountsContext'
import SettingsContext, {
  defaultSettings,
  Settings
} from './context/settingsContext'
import ServersContext, { Servers } from './context/serversContext'
import DisconnectDialog from './components/DisconnectDialog'
import ChatScreen from './screens/chat/ChatScreen'
import ServerScreen from './screens/ServerScreen'
import AccountScreen from './screens/AccountScreen'
import SettingScreen from './screens/SettingScreen'
import globalStyle from './globalStyle'

const Stacks = createNativeStackNavigator()
const Tabs = createMaterialTopTabNavigator() // createBottomTabNavigator()

export interface RootStackParamList {
  [index: string]: any
  Home: undefined
  Chat: { serverName: string; version: number }
}
type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>

const HomeScreen = ({ navigation }: { navigation: HomeNavigationProp }) => {
  const { connection } = React.useContext(ConnectionContext)
  React.useEffect(() => {
    if (connection) {
      navigation.push('Chat', {
        serverName: connection.serverName,
        version: connection.connection.options.protocolVersion
      })
    }
  }, [connection, navigation])

  return (
    <Tabs.Navigator
      tabBarPosition='bottom'
      screenOptions={({ route }) => ({
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBarIcon: ({ focused, color }) => {
          let Component = Ionicons
          let iconName = focused ? 'ios-list-circle' : 'ios-list'
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
        tabBarLabelStyle: { marginBottom: 5 },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#a0a0a0',
        headerShown: false
      })}
    >
      <Tabs.Screen name='Servers' component={ServerScreen} />
      <Tabs.Screen name='Accounts' component={AccountScreen} />
      <Tabs.Screen name='Settings' component={SettingScreen} />
    </Tabs.Navigator>
  )
}

const App = () => {
  const colorScheme = useColorScheme()
  const [connection, setConnection] = React.useState<Connection | undefined>()
  const [disconnect, setDisconnect] = React.useState<Disconnect | undefined>()

  const [settings, setSettings] = useJsonAsyncStorage<Settings>(
    '@settings',
    defaultSettings,
    true
  )
  const [accountsStore, setAccountsStore] = useAsyncStorage('@accounts', '{}')
  const [serversStore, setServersStore] = useAsyncStorage('@servers', '{}')
  const accounts: Accounts = JSON.parse(accountsStore)
  const servers: Servers = JSON.parse(serversStore)
  const setAccounts = (newAccounts: Accounts) =>
    setAccountsStore(JSON.stringify({ ...accounts, ...newAccounts }))
  const setServers = (newServers: Servers) =>
    setServersStore(JSON.stringify({ ...servers, ...newServers }))
  const systemDefault = colorScheme === null ? true : colorScheme === 'dark'
  const darkMode =
    settings.darkMode === null ? systemDefault : settings.darkMode
  // Change navigation bar colour on dark mode.
  // LOW-TODO: Doesn't work correctly in modals.
  useEffect(() => {
    // iOS-TODO: Port NavBarColorModule to iOS.
    if (Platform.OS === 'android' && NativeModules.NavBarColorModule) {
      NativeModules.NavBarColorModule.setNavigationBarColor(
        darkMode ? '#121212' : '#ffffff',
        false,
        darkMode
      )
    }
  }, [darkMode])

  return (
    <SafeAreaView style={globalStyle.flexSpacer}>
      <ConnectionContext.Provider
        value={{
          connection,
          setConnection,
          disconnectReason: disconnect,
          setDisconnectReason: setDisconnect
        }}
      >
        <SettingsContext.Provider value={{ settings, setSettings }}>
          <ServersContext.Provider value={{ servers, setServers }}>
            <AccountsContext.Provider value={{ accounts, setAccounts }}>
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
                    animation: 'slide_from_right'
                  }}
                >
                  <Stacks.Screen name='Home' component={HomeScreen} />
                  <Stacks.Screen
                    name='Chat'
                    component={ChatScreen}
                    getId={({ params }) => {
                      return (params as { serverName: string }).serverName
                    }}
                  />
                  <Stacks.Screen name='Settings' component={SettingScreen} />
                </Stacks.Navigator>
              </NavigationContainer>
            </AccountsContext.Provider>
          </ServersContext.Provider>
        </SettingsContext.Provider>
      </ConnectionContext.Provider>
    </SafeAreaView>
  )
}

export default App
