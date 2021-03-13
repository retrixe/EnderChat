// Consider using Recoil instead of Context?
import React from 'react'

export interface Account {
  authentication?: string
  password?: string
  active: boolean
}

export interface Accounts {
  [username: string]: Account
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
