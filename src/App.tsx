import React from 'react'
import { useColorScheme, StatusBar, SafeAreaView } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'
import { NavigationContainer, DarkTheme } from '@react-navigation/native'
import {
  createNativeStackNavigator,
  NativeStackNavigationProp
} from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import useAsyncStorage from './helpers/useAsyncStorage'
import useJsonAsyncStorage from './helpers/useJsonAsyncStorage'
import ConnectionContext, { Connection } from './context/connectionContext'
import AccountsContext, { Accounts } from './context/accountsContext'
import SettingsContext, { Settings } from './context/settingsContext'
import ServersContext, { Servers } from './context/serversContext'
import ChatScreen from './screens/ChatScreen'
import ServerScreen from './screens/ServerScreen'
import AccountScreen from './screens/accounts/AccountScreen'
import SettingScreen from './screens/SettingScreen'
import globalStyle from './globalStyle'

const Stacks = createNativeStackNavigator()
const Tabs = createBottomTabNavigator()

type HomeNavigationProp = NativeStackNavigationProp<
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
        },
        tabBarLabelStyle: { marginBottom: 5 },
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

  const [settings, setSettings] = useJsonAsyncStorage<Settings>('@settings', {
    // TODO: Better defaults.
    joinMessage:
      'I connected using EnderChat, an ad-free, easy to use and well-built ' +
      'alternative to ChatCraft for Android! Even this message can be disabled!',
    sendJoinMessage: true,
    sendSpawnCommand: true,
    chatTheme: 'Colorless',
    fontSize: 16,
    webLinks: true,
    darkMode: null,
    linkPrompt: true
  })
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

  return (
    <SafeAreaView style={globalStyle.flexSpacer}>
      <ConnectionContext.Provider value={{ connection, setConnection }}>
        <SettingsContext.Provider value={{ settings, setSettings }}>
          <ServersContext.Provider value={{ servers, setServers }}>
            <AccountsContext.Provider value={{ accounts, setAccounts }}>
              <NavigationContainer theme={darkMode ? DarkTheme : undefined}>
                <StatusBar
                  backgroundColor={darkMode ? '#242424' : '#ffffff'}
                  barStyle={darkMode ? 'light-content' : 'dark-content'}
                />
                <Stacks.Navigator
                  initialRouteName='Home'
                  screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right'
                  }}
                >
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
