import React, { useContext, useState } from 'react'
import { StyleSheet, View, Pressable, Image } from 'react-native'

import MicrosoftLogin from './MicrosoftLogin'
import globalStyle from '../../globalStyle'
import Text from '../Text'
import Dialog, { dialogStyles } from '../Dialog'
import TextField from '../TextField'
import useDarkMode from '../../context/useDarkMode'
import UsersContext from '../../context/accountsContext'
import { authenticate } from '../../minecraft/api/yggdrasil'

const AddAccountDialog = ({
  open,
  setOpen
}: {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}) => {
  const darkMode = useDarkMode()
  const { accounts, setAccounts } = useContext(UsersContext)

  const [userRed, setUserRed] = useState(false)
  // const [passRed, setPassRed] = useState(false)
  const [newUser, setNewUser] = useState('')
  const [password, setPassword] = useState<string | null>(null)
  const [dialogError, setDialogError] = useState('')
  const [microsoftLogin, setMicrosoftLogin] = useState(false)

  const invalidNewUser =
    !!newUser &&
    !/^[A-Za-z0-9_]{3,16}$/.test(newUser) &&
    (password === null ? true : !/^[^\s@]+@[^\s@]+$/.test(newUser))

  const cancelAddAccount = () => {
    setMicrosoftLogin(false)
    setOpen(false)
    setUserRed(false)
    // setPassRed(false)
    setNewUser('')
    setPassword(null) // setPassword('')
    setDialogError('')
  }
  const addAccount = () => {
    const accountExists =
      !!accounts[newUser] ||
      !!Object.keys(accounts).find(id => accounts[id].email === newUser)
    if (!newUser || invalidNewUser || password === '' || accountExists) {
      // setPassRed(password === '')
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
      authenticate(newUser, password, true)
        .then(({ clientToken, accessToken, selectedProfile: { name, id } }) => {
          setAccounts({
            ...accounts,
            [id]: {
              active: Object.keys(accounts).length === 0,
              username: name,
              email: newUser,
              accessToken,
              clientToken,
              type: 'mojang'
            }
          })
          cancelAddAccount()
        })
        .catch(e => {
          setUserRed(true)
          // setPassRed(true)
          setDialogError((e.message || '').replace('Invalid credentials. ', ''))
        })
    }
  }

  return (
    <Dialog visible={open} onRequestClose={cancelAddAccount}>
      {microsoftLogin && <MicrosoftLogin close={cancelAddAccount} />}
      <Text style={styles.modalTitle}>Add Account</Text>
      <Pressable
        style={styles.microsoftButton}
        android_ripple={{ color: '#aaa' }}
        onPress={() => setMicrosoftLogin(true)}
      >
        <Image source={require('../../assets/microsoft.png')} />
        <Text style={styles.microsoftButtonText}>Login with Microsoft</Text>
      </Pressable>
      <Text style={styles.discontinued}>
        Note: Mojang Accounts are discontinued. Please migrate to Microsoft on
        PC to login.
      </Text>
      <View style={styles.divider} />
      <Text style={styles.subheader}>Offline Mode (discouraged)</Text>
      <TextField
        red={userRed || invalidNewUser}
        value={newUser}
        onChangeText={setNewUser}
        keyboardType='email-address'
        placeholder={'Username' + (password !== null ? '/E-mail' : '')}
      />
      {/* <Pressable
        style={styles.auth}
        onPress={() => setPassword(p => (p === null ? '' : null))}
      >
        <Text style={darkMode ? styles.authTextDark : styles.authText}>
          Offline Mode (discouraged)
        </Text>
        <View style={globalStyle.flexSpacer} />
        <Switch
          value={password === null}
          thumbColor='#ffaaaa'
          ios_backgroundColor='#ffaaaa'
          trackColor={{ true: '#ff0000', false: '#ffdddd' }}
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
      )} */}
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
  )
}

const styles = StyleSheet.create({
  microsoftButton: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 3,
    padding: 8
  },
  microsoftButtonText: { color: '#ffffff', fontWeight: 'bold', marginLeft: 8 },
  dialogError: { color: '#ff6666', marginTop: 10, marginBottom: 10 },
  auth: { marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  authText: { fontSize: 14, color: '#666666' },
  authTextDark: { fontSize: 14, color: '#aaa' },
  divider: {
    marginTop: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#afafaf'
  },
  discontinued: { fontSize: 14, fontWeight: 'bold', marginTop: 8 },
  subheader: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  ...dialogStyles
})

export default AddAccountDialog
