import React, { useContext, useRef, useState } from 'react'
import { StyleSheet, Modal, Platform, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { WebView, type WebViewNavigation } from 'react-native-webview'

import useDarkMode from '../../context/useDarkMode'
import UsersContext from '../../context/accountsContext'
import {
  loginUrl,
  redirectUrlPrefix,
  XstsError,
  getMSAuthToken,
  getXboxLiveTokenAndUserHash,
  getXstsTokenAndUserHash,
  authenticateWithXsts,
  getGameProfile,
} from '../../minecraft/api/microsoft'
import config from '../../../config.json'

const MicrosoftLogin = ({ close }: { close: () => void }): JSX.Element => {
  const darkMode = useDarkMode()
  const style = darkMode
    ? '<style>body{font-size:48px;padding:16px;background-color:#242424;color:#ffffff;}</style>'
    : '<style>body{font-size:48px;padding:16px;}</style>'
  const { accounts, setAccounts } = useContext(UsersContext)

  const webview = useRef<WebView>(null)
  const [loading, setLoading] = useState(false)
  const [html, setRawHtml] = useState('')
  const setHtml = (newHtml: string): void => setRawHtml(style + newHtml)

  const addAccount = (
    id: string,
    microsoftAccessToken: string,
    microsoftRefreshToken: string,
    accessToken: string,
    username: string,
  ): boolean => {
    // Honestly, overwrite the old Microsoft account, but inform the user.
    const alreadyExists = accounts[id] && accounts[id].type === 'microsoft'
    setAccounts({
      ...accounts,
      [id]: {
        active: Object.keys(accounts).length === 0 || (alreadyExists && accounts[id].active),
        microsoftRefreshToken,
        microsoftAccessToken,
        accessToken,
        username,
        type: 'microsoft',
      },
    })
    return alreadyExists
  }

  const onRequestClose = (): void => {
    if (!loading) close()
  }
  const handleNavigationStateChange = async (newNavState: WebViewNavigation): Promise<void> => {
    // LOW-TODO: Parse errors.
    if (!webview.current || !newNavState.url) return
    if (Platform.OS === 'android' && webview.current.clearCache && webview.current.clearHistory) {
      webview.current.clearCache(true)
      webview.current.clearHistory()
    }
    if (!loading && newNavState.url.startsWith(redirectUrlPrefix)) {
      try {
        setLoading(true)
        webview.current.stopLoading()
        setHtml('<h1>Loading...</h1>')
        webview.current.reload()
        const suffix = newNavState.url.substring(redirectUrlPrefix.length)
        const authCode = suffix.substring(0, suffix.indexOf('&'))
        const [msAccessToken, msRefreshToken] = await getMSAuthToken(
          authCode,
          config.clientId,
          config.scope,
        )
        const [xboxLiveToken, xboxUserHash] = await getXboxLiveTokenAndUserHash(msAccessToken)
        const [xstsToken] = await getXstsTokenAndUserHash(xboxLiveToken)
        const accessToken = await authenticateWithXsts(xstsToken, xboxUserHash)
        const gameProfile = await getGameProfile(accessToken)
        const alreadyExists = addAccount(
          gameProfile.id,
          msAccessToken,
          msRefreshToken,
          accessToken,
          gameProfile.name,
        )
        setLoading(false)
        if (alreadyExists) {
          setHtml(
            '<h1>You are already logged into this account! However, your account credentials have been updated.</h1>',
          )
        } else {
          setHtml('')
          close()
        }
      } catch (e) {
        setLoading(false)
        if (e instanceof XstsError) {
          setHtml(`<h1>Xbox Live Error (${e.XErr}): ${e.XErrMessage}</h1>`)
        } else if (e instanceof Error && e.message === 'This user does not own Minecraft!') {
          setHtml('<h1>You do not own Minecraft!</h1>')
        } else {
          console.error(e)
          setHtml('<h1>An unknown error occurred while logging in.</h1>')
        }
      }
    }
  }

  const uri = loginUrl
    .replace('{CLIENT_ID}', config.clientId)
    .replace('{SCOPE}', encodeURIComponent(config.scope))
  // Turns out WebView modals are broken on more than Pixel, so we have a full-screen view now.
  return (
    <Modal
      animationType='fade'
      transparent
      visible
      statusBarTranslucent={false}
      onRequestClose={onRequestClose}
    >
      <View style={styles.modalView}>
        <View
          style={[
            darkMode ? styles.modalTopBarDarkBg : styles.modalTopBarLightBg,
            styles.modalTopBar,
          ]}
        >
          <Ionicons.Button name='close' onPress={onRequestClose}>
            Close
          </Ionicons.Button>
        </View>
        <WebView
          incognito
          ref={webview}
          originWhitelist={['*']}
          source={html ? { html } : { uri }}
          onNavigationStateChange={(ev: WebViewNavigation) => {
            handleNavigationStateChange(ev).catch(console.error)
          }}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalView: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  modalTopBarLightBg: { backgroundColor: '#ffffff' },
  modalTopBarDarkBg: { backgroundColor: '#242424' },
  modalTopBar: { padding: 8, flexDirection: 'row' },
})

export default MicrosoftLogin
