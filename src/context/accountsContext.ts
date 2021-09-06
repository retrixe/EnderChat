// Consider using Recoil instead of Context?
import React from 'react'

export interface Account {
  clientToken?: string
  accessToken?: string
  username: string
  active: boolean
  email?: string
  type?: 'microsoft' | 'mojang'
}

export interface Accounts {
  [uuid: string]: Account
}

export interface AccountsContext {
  accounts: Accounts
  setAccounts: (newAccounts: Accounts) => void
}

const accountsContext = React.createContext<AccountsContext>({
  accounts: {},
  setAccounts: () => {}
})

export default accountsContext
