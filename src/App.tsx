import 'react-native-gesture-handler'

import React from 'react'
import { StatusBar, SafeAreaView } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'
import { NavigationContainer } from '@react-navigation/native'
import {
  createStackNavigator,
  StackNavigationProp
} from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import useAsyncStorage from './useAsyncStorage'
import ConnectionContext, { Connection } from './context/connectionContext'
import AccountsContext, { Accounts } from './context/accountsContext'
import SettingsContext, { Settings } from './context/settingsContext'
import ServersContext, { Servers } from './context/serversContext'
import ChatScreen from './screens/ChatScreen'
import ServerScreen from './screens/ServerScreen'
import AccountScreen from './screens/AccountScreen'
import SettingScreen from './screens/SettingScreen'
import globalStyle from './globalStyle'

const Stacks = createStackNavigator()
const Tabs = createBottomTabNavigator()

type HomeNavigationProp = StackNavigationProp<
  { Home: undefined; Chat: undefined },
  'Home'
>

const HomeScreen = ({ navigation }: { navigation: HomeNavigationProp }) => {
  const { connection } = React.useContext(ConnectionContext)
  React.useEffect(() => {
    if (connection) navigation.push('Chat')
  }, [connection, navigation])

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        // eslint-disable-next-line react/prop-types,react/display-name
        tabBarIcon: ({ focused, color, size }) => {
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
          return <Component name={iconName} size={size} color={color} />
        }
      })}
      tabBarOptions={{ labelStyle: { marginBottom: 5 } }}
    >
      <Tabs.Screen name='Servers' component={ServerScreen} />
      <Tabs.Screen name='Accounts' component={AccountScreen} />
      <Tabs.Screen name='Settings' component={SettingScreen} />
    </Tabs.Navigator>
  )
}

const App = () => {
  const [connection, setConnection] = React.useState<Connection | undefined>()

  const [settingsStore, setSettingsStore] = useAsyncStorage(
    '@settings',
    JSON.stringify({
      // TODO: Better defaults. Also, adding new settings is ineffective here.
      // Have better system for this e.g. useJsonAsyncStorage?
      joinMessage: '',
      sendJoinMessage: false,
      sendSpawnCommand: false,
      chatTheme: 'Colorless',
      fontSize: 16,
      webLinks: true,
      darkMode: false,
      linkPrompt: true
    })
  )
  const [accountsStore, setAccountsStore] = useAsyncStorage('@accounts', '{}')
  const [serversStore, setServersStore] = useAsyncStorage('@servers', '{}')
  const accounts: Accounts = JSON.parse(accountsStore)
  const settings: Settings = JSON.parse(settingsStore)
  const servers: Servers = JSON.parse(serversStore)
  const setAccounts = (newAccounts: Accounts) =>
    setAccountsStore(JSON.stringify({ ...accounts, ...newAccounts }))
  const setSettings = (newSettings: Partial<Settings>) =>
    setSettingsStore(JSON.stringify({ ...settings, ...newSettings }))
  const setServers = (newServers: Servers) =>
    setServersStore(JSON.stringify({ ...servers, ...newServers }))

  return (
    <SafeAreaView style={globalStyle.flexSpacer}>
      <ConnectionContext.Provider value={{ connection, setConnection }}>
        <SettingsContext.Provider value={{ settings, setSettings }}>
          <ServersContext.Provider value={{ servers, setServers }}>
            <AccountsContext.Provider value={{ accounts, setAccounts }}>
              <NavigationContainer>
                <StatusBar backgroundColor='#ffffff' barStyle='dark-content' />
                <Stacks.Navigator initialRouteName='Home' headerMode='none'>
                  <Stacks.Screen name='Home' component={HomeScreen} />
                  <Stacks.Screen name='Chat' component={ChatScreen} />
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
