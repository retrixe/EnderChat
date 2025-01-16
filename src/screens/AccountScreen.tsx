import React, { useContext, useState } from 'react'
import { StyleSheet, View, Pressable } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import AddAccountDialog from '../components/accounts/AddAccountDialog'
import AccountDisplay from '../components/accounts/AccountDisplay'
import globalStyle from '../globalStyle'
import Text from '../components/Text'
import Dialog, { dialogStyles } from '../components/Dialog'
import useDarkMode from '../context/useDarkMode'
import UsersContext from '../context/accountsContext'
import { invalidate } from '../minecraft/api/yggdrasil'

// LOW-TODO: Reload to update account info for online mode using /refresh.
// Also, to reload all the skin images?
const AccountScreen = (): React.JSX.Element => {
  const darkMode = useDarkMode()
  const { accounts, setAccounts } = useContext(UsersContext)

  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false)
  const [deleteAccount, setDeleteAccount] = useState('')

  const setActiveAccount = (uuid: string): void => {
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
      <AddAccountDialog open={addAccountDialogOpen} setOpen={setAddAccountDialogOpen} />
      <Dialog
        visible={!!deleteAccount}
        onRequestClose={() => setDeleteAccount('')}
        containerStyles={styles.deleteAccountDialog}
      >
        <Pressable
          onPress={() => {
            const account = accounts[deleteAccount]
            if (account.type === 'mojang') {
              // LOW-TODO: Do something more intelligent? Should alert the user.
              invalidate(account.accessToken, account.clientToken).catch(console.error)
            }
            const newAccounts = { ...accounts }
            delete newAccounts[deleteAccount]
            setDeleteAccount('')
            setAccounts(newAccounts)
          }}
          android_ripple={{ color: '#aaa' }}
          style={styles.modalButton}
        >
          <Text style={styles.deleteAccountText}>
            Delete '{deleteAccount && accounts[deleteAccount].username}' account
          </Text>
        </Pressable>
      </Dialog>
      <View style={darkMode ? globalStyle.darkHeader : globalStyle.header}>
        <Text style={globalStyle.title}>Accounts</Text>
        <View style={globalStyle.flexSpacer} />
        <Ionicons.Button
          name='add'
          onPress={() => setAddAccountDialogOpen(true)}
          iconStyle={globalStyle.iconStyle}
        >
          <Text style={globalStyle.iconButtonText}>Add</Text>
        </Ionicons.Button>
      </View>
      <View style={globalStyle.outerView}>
        {Object.keys(accounts)
          .sort((a, b) => (accounts[a].active ? -1 : accounts[b].active ? 1 : a.localeCompare(b)))
          .map(uuid => (
            <AccountDisplay
              key={uuid}
              uuid={uuid}
              darkMode={darkMode}
              account={accounts[uuid]}
              setActiveAccount={setActiveAccount}
              setDeleteAccount={setDeleteAccount}
            />
          ))}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  deleteAccountText: { fontSize: 16 },
  deleteAccountDialog: { padding: 0 },
  ...dialogStyles,
})

export default AccountScreen
