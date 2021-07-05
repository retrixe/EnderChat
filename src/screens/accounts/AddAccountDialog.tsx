import React, { useContext, useState } from 'react'
import { StyleSheet, View, Switch, Pressable } from 'react-native'

import globalStyle from '../../globalStyle'
import Text from '../../components/Text'
import Dialog, { dialogStyles } from '../../components/Dialog'
import TextField from '../../components/TextField'
import useDarkMode from '../../context/useDarkMode'
import UsersContext from '../../context/accountsContext'
import { authenticate } from '../../minecraft/yggdrasil'

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
  const [passRed, setPassRed] = useState(false)
  const [newUser, setNewUser] = useState('')
  const [password, setPassword] = useState<string | null>('')
  const [dialogError, setDialogError] = useState('')

  const invalidNewUser =
    !!newUser &&
    !/^[A-Za-z0-9_]{3,16}$/.test(newUser) &&
    (password === null ? true : !/^[^\s@]+@[^\s@]+$/.test(newUser))

  const cancelAddAccount = () => {
    setOpen(false)
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

  return (
    <Dialog visible={open} onRequestClose={cancelAddAccount}>
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
  )
}

const styles = StyleSheet.create({
  dialogError: { color: '#ff6666', marginTop: 10, marginBottom: 10 },
  auth: { marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  authText: { fontSize: 14, color: '#666666' },
  authTextDark: { fontSize: 14, color: '#aaa' },
  ...dialogStyles
})

export default AddAccountDialog
