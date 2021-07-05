import React, { useContext, useState } from 'react'
import { StyleSheet, View, Image, Switch, Pressable } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import globalStyle from '../globalStyle'
import Text from '../components/Text'
import Dialog, { dialogStyles } from '../components/Dialog'
import TextField from '../components/TextField'
import useDarkMode from '../context/useDarkMode'
import UsersContext from '../context/accountsContext'
import ElevatedView from '../components/ElevatedView'
import { authenticate, invalidate } from '../minecraft/yggdrasil'

// TODO: Enable reloading to update account info for online mode using /refresh.
// LOW-TODO: For performance, isolate the creation dialog into its own component.
const AccountScreen = () => {
  const darkMode = useDarkMode()
  const { accounts, setAccounts } = useContext(UsersContext)

  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false)
  const [userRed, setUserRed] = useState(false)
  const [passRed, setPassRed] = useState(false)
  const [newUser, setNewUser] = useState('')
  const [password, setPassword] = useState<string | null>('')
  const [dialogError, setDialogError] = useState('')
  const [deleteAccount, setDeleteAccount] = useState('')

  const invalidNewUser =
    !!newUser &&
    !/^[A-Za-z0-9_]{3,16}$/.test(newUser) &&
    (password === null ? true : !/^[^\s@]+@[^\s@]+$/.test(newUser))

  const cancelAddAccount = () => {
    setAddAccountDialogOpen(false)
    setUserRed(false)
    setPassRed(false)
    setNewUser('')
    setPassword('')
    setDialogError('')
  }
  const addAccount = async () => {
    const accountExists =
      !!accounts[newUser] ||
      !!Object.keys(accounts).find(id => accounts[id].email === newUser)
    if (!newUser || invalidNewUser || password === '' || accountExists) {
      setPassRed(password === '')
      setUserRed(!newUser)
      if (accountExists) {
        setDialogError('This account already exists! Delete it first.')
      }
      return
    }
    if (password === null) {
      setAccounts({
        ...accounts,
        [newUser]: {
          username: newUser,
          active: Object.keys(accounts).length === 0
        }
      })
      cancelAddAccount()
    } else {
      try {
        const {
          clientToken,
          accessToken,
          selectedProfile: { name, id }
        } = await authenticate(newUser, password, true)
        setAccounts({
          ...accounts,
          [id]: {
            active: Object.keys(accounts).length === 0,
            username: name,
            email: newUser,
            accessToken,
            clientToken
          }
        })
        cancelAddAccount()
      } catch (e) {
        setUserRed(true)
        setPassRed(true)
        setDialogError((e.message || '').replace('Invalid credentials. ', ''))
      }
    }
  }
  const setActiveAccount = (uuid: string) => {
    const newAccounts = accounts
    for (const key in newAccounts) {
      if (newAccounts[key].active) {
        newAccounts[key].active = false
      }
    }
    newAccounts[uuid].active = true
    setAccounts(newAccounts)
  }

  return (
    <>
      <Dialog
        visible={!!deleteAccount}
        onRequestClose={() => setDeleteAccount('')}
        containerStyles={styles.deleteAccountDialog}
      >
        <Pressable
          onPress={async () => {
            const { accessToken, clientToken } = accounts[deleteAccount]
            if (accessToken && clientToken) {
              try {
                await invalidate(accessToken, clientToken)
              } catch (e) {
                return // TODO: Do something more intelligent? Should alert the user.
              }
            }
            delete accounts[deleteAccount]
            setDeleteAccount('')
            setAccounts(accounts)
          }}
          android_ripple={{ color: '#aaa' }}
          style={styles.modalButton}
        >
          <Text style={styles.deleteAccountText}>
            Delete '{deleteAccount && accounts[deleteAccount].username}' account
          </Text>
        </Pressable>
      </Dialog>
      <Dialog visible={addAccountDialogOpen} onRequestClose={cancelAddAccount}>
        <Text style={styles.modalTitle}>Add Account</Text>
        <TextField
          red={userRed || invalidNewUser}
          value={newUser}
          onChangeText={setNewUser}
          keyboardType='email-address'
          placeholder={'Username' + (password !== null ? '/E-mail' : '')}
        />
        <Pressable
          style={styles.auth}
          onPress={() => setPassword(p => (p === null ? '' : null))}
        >
          <Text style={darkMode ? styles.authTextDark : styles.authText}>
            Login with Mojang
          </Text>
          <View style={globalStyle.flexSpacer} />
          <Switch
            value={typeof password === 'string'}
            onValueChange={() => setPassword(p => (p === null ? '' : null))}
          />
        </Pressable>
        {typeof password === 'string' && (
          <TextField
            red={passRed}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder='Password'
          />
        )}
        {dialogError ? (
          <Text style={styles.dialogError}>{dialogError}</Text>
        ) : (
          false
        )}
        <View style={styles.modalButtons}>
          <View style={globalStyle.flexSpacer} />
          <Pressable
            onPress={cancelAddAccount}
            android_ripple={{ color: '#aaa' }}
            style={styles.modalButton}
          >
            <Text
              style={
                darkMode
                  ? styles.modalButtonCancelDarkText
                  : styles.modalButtonCancelText
              }
            >
              CANCEL
            </Text>
          </Pressable>
          <Pressable
            onPress={addAccount}
            android_ripple={{ color: '#aaa' }}
            style={styles.modalButton}
          >
            <Text style={styles.modalButtonText}>ADD</Text>
          </Pressable>
        </View>
      </Dialog>
      <View style={darkMode ? globalStyle.darkHeader : globalStyle.header}>
        <Text style={globalStyle.title}>Accounts</Text>
        <View style={globalStyle.flexSpacer} />
        <Ionicons.Button
          name='add'
          onPress={() => setAddAccountDialogOpen(true)}
          iconStyle={globalStyle.iconStyle}
        >
          Add
        </Ionicons.Button>
      </View>
      <View style={globalStyle.outerView}>
        {Object.keys(accounts)
          .sort((a, b) =>
            accounts[a].active
              ? -1
              : accounts[b].active
              ? 1
              : a.localeCompare(b)
          )
          .map(uuid => (
            <ElevatedView key={uuid} style={styles.accountView}>
              <Pressable
                onPress={() => setActiveAccount(uuid)}
                onLongPress={() => setDeleteAccount(uuid)}
                android_ripple={{ color: '#aaa' }}
                style={styles.accountPressable}
              >
                <Image
                  source={{
                    uri: `https://crafthead.net/avatar/${uuid}/72`
                  }}
                  style={styles.accountImage}
                />
                <View>
                  <Text style={styles.username}>{accounts[uuid].username}</Text>
                  {accounts[uuid].active && (
                    <Text style={styles.active}>Active Account</Text>
                  )}
                  <Text
                    style={
                      darkMode
                        ? styles.authenticationDark
                        : styles.authentication
                    }
                  >
                    {accounts[uuid].accessToken
                      ? 'Mojang: ' + accounts[uuid].email
                      : 'No Authentication'}
                  </Text>
                </View>
              </Pressable>
            </ElevatedView>
          ))}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  accountView: { marginBottom: 12 },
  accountPressable: { padding: 8, flexDirection: 'row' },
  accountImage: {
    padding: 4,
    height: 72,
    width: 72,
    resizeMode: 'contain',
    marginRight: 16
  },
  active: { fontSize: 16 },
  username: { fontSize: 20, fontWeight: 'bold' },
  dialogError: { color: '#ff6666', marginTop: 10, marginBottom: 10 },
  authentication: { fontSize: 12, color: '#666', fontWeight: '300' },
  authenticationDark: { fontSize: 12, color: '#aaa', fontWeight: '300' },
  auth: { marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  authText: { fontSize: 14, color: '#666666' },
  authTextDark: { fontSize: 14, color: '#aaa' },
  deleteAccountText: { fontSize: 16 },
  deleteAccountDialog: { padding: 0 },
  ...dialogStyles
})

export default AccountScreen
