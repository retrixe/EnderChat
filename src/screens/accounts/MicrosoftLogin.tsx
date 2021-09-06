import React, { /* useContext, */ useRef, useState } from 'react'
import { StyleSheet, Pressable, Modal } from 'react-native'
import { WebView, WebViewNavigation } from 'react-native-webview'

// import useDarkMode from '../../context/useDarkMode'
// import UsersContext from '../../context/accountsContext'
import {
  loginUrl,
  redirectUrlPrefix,
  XstsError,
  getMSAuthToken,
  getXboxLiveTokenAndUserHash,
  getXstsTokenAndUserHash,
  authenticateWithXsts,
  getGameProfile
} from '../../minecraft/microsoft'

const MicrosoftLogin = ({ close }: { close: () => void }) => {
  // const darkMode = useDarkMode() // TODO: Make use on loading screen.
  // const { setAccounts } = useContext(UsersContext)

  const webview = useRef<WebView>(null)
  const [loading, setLoading] = useState(false)
  const [html, setHtml] = useState(
    '<h1>Hand tight, MSA support is being worked on!</h1>'
  )

  const onRequestClose = () => {
    if (!loading) close()
  }
  const handleNavigationStateChange = async (
    newNavState: WebViewNavigation
  ) => {
    if (!webview.current || !newNavState.url) return
    webview.current.clearCache(true)
    webview.current.clearHistory()
    if (!loading && newNavState.url.startsWith(redirectUrlPrefix)) {
      try {
        setLoading(true)
        webview.current.stopLoading()
        setHtml('<h1>Loading...</h1>')
        webview.current.reload()
        const suffix = newNavState.url.substring(redirectUrlPrefix.length)
        const authCode = suffix.substr(0, suffix.indexOf('&'))
        const authToken = await getMSAuthToken(authCode)
        const [xboxLiveToken, xboxUserHash] = await getXboxLiveTokenAndUserHash(
          authToken
        )
        const [xstsToken] = await getXstsTokenAndUserHash(xboxLiveToken)
        const accessToken = await authenticateWithXsts(xstsToken, xboxUserHash)
        /* const gameProfile = */ await getGameProfile(accessToken)
        // TODO: Save the account.
        setLoading(false)
        setHtml('')
      } catch (e) {
        setLoading(false)
        if (e instanceof XstsError) {
          setHtml(`<h1>Xbox Live Error (${e.XErr}): ${e.XErrMessage}</h1>`)
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
