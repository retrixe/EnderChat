import React from 'react'

export interface Account {
  microsoftAccessToken?: string // Microsoft only.
  microsoftRefreshToken?: string // Microsoft only.
  clientToken?: string // Yggdrasil only.
  accessToken?: string
  username: string
  active: boolean
  email?: string // Yggdrasil only.
  type?: 'microsoft' | 'mojang'
}

export type Accounts = Record<string, Account>

export interface AccountsContext {
  accounts: Accounts
  setAccounts: (newAccounts: Accounts) => void
}

const accountsContext = React.createContext<AccountsContext>({
  accounts: {},
  setAccounts: () => {}
})

export default accountsContext
