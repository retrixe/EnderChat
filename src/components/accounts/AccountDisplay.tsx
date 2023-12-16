import React from 'react'
import { Image, Pressable, StyleSheet, View } from 'react-native'
import { type Account } from '../../context/accountsContext'
import ElevatedView from '../ElevatedView'
import Text from '../Text'

const AccountDisplay = ({
  uuid,
  account,
  darkMode,
  setActiveAccount,
  setDeleteAccount
}: {
  uuid: string
  account: Account
  darkMode: boolean
  setActiveAccount: (uuid: string) => void
  setDeleteAccount: (uuid: string) => void
}): JSX.Element => (
  <ElevatedView style={styles.accountView}>
    <Pressable
      onPress={() => setActiveAccount(uuid)}
      onLongPress={() => setDeleteAccount(uuid)}
      android_ripple={{ color: '#aaa' }}
      style={styles.accountPressable}
    >
      <Image
        source={{
          uri: `https://crafthead.net/avatar/${
            account.type ? uuid : account.username
          }/72`
        }}
        style={styles.accountImage}
      />
      <View>
        <Text style={styles.username}>{account.username}</Text>
        <Text style={darkMode ? styles.authTxtDark : styles.authTxt}>
          {account.type === 'mojang'
            ? 'Mojang: ' + account.email
            : account.type === 'microsoft'
              ? 'Microsoft Account'
              : 'Offline Mode'}
        </Text>
        {account.active && <Text style={styles.active}>Active Account</Text>}
      </View>
    </Pressable>
  </ElevatedView>
)

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
  active: { fontSize: 14, fontWeight: 'bold' },
  username: { fontSize: 20, fontWeight: 'bold' },
  authTxt: { fontSize: 12, color: '#666', fontWeight: '400' },
  authTxtDark: { fontSize: 12, color: '#aaa', fontWeight: '400' }
})

export default AccountDisplay
