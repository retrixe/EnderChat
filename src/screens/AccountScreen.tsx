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

const AccountScreen = () => {
  const darkMode = useDarkMode()
  const { accounts, setAccounts } = useContext(UsersContext)

  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState('')
  const [userRed, setUserRed] = useState(false)
  const [passRed, setPassRed] = useState(false)
  const [password, setPassword] = useState<string | null>('')
  const [deleteAccount, setDeleteAccount] = useState('')

  const invalidNewUser = !/^[A-Za-z0-9_]{3,16}$/.test(newUser) && !!newUser

  const cancelAddAccount = () => {
    setAddAccountDialogOpen(false)
    setNewUser('')
    setUserRed(false)
    setPassRed(false)
    setPassword('')
  }
  const addAccount = () => {
    if (!newUser || invalidNewUser || password === '' || accounts[newUser]) {
      setPassRed(password === '')
      setUserRed(!newUser)
      return
    }
    setAccounts({
      ...accounts,
      [newUser]: {
        active: Object.keys(accounts).length === 0,
        authentication: '', // TODO: What to do with authentication?
        ...(password === null ? {} : { password })
      }
    })
    cancelAddAccount()
  }
  const setActiveAccount = (username: string) => {
    const newAccounts = accounts
    for (const key in newAccounts) {
      if (newAccounts[key].active) {
        newAccounts[key].active = false
      }
    }
    newAccounts[username].active = true
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
          onPress={() => {
            delete accounts[deleteAccount]
            setDeleteAccount('')
            setAccounts(accounts)
          }}
          android_ripple={{ color: '#aaa' }}
          style={styles.modalButton}
        >
          <Text style={styles.deleteAccountText}>
            Delete '{deleteAccount}' account
          </Text>
        </Pressable>
      </Dialog>
      <Dialog visible={addAccountDialogOpen} onRequestClose={cancelAddAccount}>
        <Text style={styles.modalTitle}>Add Account</Text>
        <TextField
          red={!!accounts[newUser] || userRed || invalidNewUser}
          value={newUser}
          onChangeText={setNewUser}
          keyboardType='email-address'
          placeholder='Username'
        />
        <Pressable
          style={styles.auth}
          onPress={() => setPassword(p => (p === null ? '' : null))}
        >
          <Text style={darkMode ? styles.authTextDark : styles.authText}>
            Authentication
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
          .map(username => (
            <ElevatedView key={username} style={styles.accountView}>
              <Pressable
                onPress={() => setActiveAccount(username)}
                onLongPress={() => setDeleteAccount(username)}
                android_ripple={{ color: '#aaa' }}
                style={styles.accountPressable}
              >
                <Image
                  source={{
                    uri: `https://crafthead.net/avatar/${username}/72`
                  }}
                  style={styles.accountImage}
                />
                <View>
                  <Text style={styles.username}>{username}</Text>
                  {accounts[username].active && (
                    <Text style={styles.active}>Active Account</Text>
                  )}
                  <Text
                    style={
                      darkMode
                        ? styles.authenticationDark
                        : styles.authentication
                    }
                  >
                    {accounts[username].authentication
                      ? 'Premium'
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
