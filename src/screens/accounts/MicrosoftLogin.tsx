import React, { useContext, useRef, useState } from 'react'
import { StyleSheet, Pressable, Modal, Platform } from 'react-native'
import { WebView, WebViewNavigation } from 'react-native-webview'

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
  getGameProfile
} from '../../minecraft/authentication/microsoft'

const MicrosoftLogin = ({ close }: { close: () => void }) => {
  const darkMode = useDarkMode()
  const style = darkMode
    ? '<style>body{font-size:48px;padding:16px;background-color:#242424;color:#ffffff;}</style>'
    : '<style>body{font-size:48px;padding:16px;}</style>'
  const { accounts, setAccounts } = useContext(UsersContext)

  const webview = useRef<WebView>(null)
  const [loading, setLoading] = useState(false)
  const [html, setRawHtml] = useState('')
  const setHtml = (newHtml: string) => setRawHtml(style + newHtml)

  const addAccount = (
    id: string,
    microsoftAccessToken: string,
    microsoftRefreshToken: string,
    accessToken: string,
    username: string
  ): boolean => {
    // Honestly, overwrite the old Microsoft account, but inform the user.
    const alreadyExists = accounts[id] && accounts[id].type === 'microsoft'
    setAccounts({
      [id]: {
        active:
          Object.keys(accounts).length === 0 ||
          (alreadyExists && accounts[id].active),
        microsoftRefreshToken,
        microsoftAccessToken,
        accessToken,
        username,
        type: 'microsoft'
      }
    })
    return alreadyExists
  }

  const onRequestClose = () => {
    if (!loading) close()
  }
  const handleNavigationStateChange = async (
    newNavState: WebViewNavigation
  ) => {
    if (!webview.current || !newNavState.url) return
    if (
      Platform.OS === 'android' &&
      webview.current.clearCache &&
      webview.current.clearHistory
    ) {
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
        const authCode = suffix.substr(0, suffix.indexOf('&'))
        const [msAccessToken, msRefreshToken] = await getMSAuthToken(authCode)
        const [xboxLiveToken, xboxUserHash] = await getXboxLiveTokenAndUserHash(
          msAccessToken
        )
        const [xstsToken] = await getXstsTokenAndUserHash(xboxLiveToken)
        const accessToken = await authenticateWithXsts(xstsToken, xboxUserHash)
        const gameProfile = await getGameProfile(accessToken)
        const alreadyExists = addAccount(
          gameProfile.id,
          msAccessToken,
          msRefreshToken,
          accessToken,
          gameProfile.name
        )
        setLoading(false)
        if (alreadyExists) {
          setHtml('<h1>You are already logged into this account!</h1>')
        } else {
          setHtml('')
          close()
        }
      } catch (e) {
        setLoading(false)
        if (e instanceof XstsError) {
          setHtml(`<h1>Xbox Live Error (${e.XErr}): ${e.XErrMessage}</h1>`)
        } else if (
          e instanceof Error &&
          e.message === 'This user does not own Minecraft!'
        ) {
          setHtml('<h1>You do not own Minecraft!</h1>')
        } else {
          console.error(e)
          setHtml('<h1>An unknown error occurred while logging in.</h1>')
        }
      }
    }
  }

  return (
    <Modal
      animationType='fade'
      transparent
      visible
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <Pressable style={styles.modalView} onPress={onRequestClose}>
        {/* Pressable opt-out. */}
        <Pressable style={styles.webViewContainer}>
          <WebView
            incognito
            ref={webview}
            originWhitelist={['*']}
            source={html ? { html } : { uri: loginUrl }}
            onNavigationStateChange={handleNavigationStateChange}
            androidLayerType={
              Platform.OS === 'android' && Platform.Version > 30
                ? 'software' // TODO: Really choppy. Solve when you get Android 12?
                : 'hardware'
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalView: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  webViewContainer: { height: '80%', width: '80%' }
})

export default MicrosoftLogin
