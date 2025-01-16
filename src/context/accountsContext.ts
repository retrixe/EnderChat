import React from 'react'

export interface BaseAccount {
  username: string
  active: boolean
}

export interface OfflineAccount extends BaseAccount {
  type?: undefined
}

export interface MicrosoftAccount extends BaseAccount {
  type: 'microsoft'
  microsoftAccessToken: string
  microsoftRefreshToken: string
  accessToken: string
}

export interface MojangAccount extends BaseAccount {
  type: 'mojang'
  clientToken: string
  accessToken: string
  email: string
}

export type Account = MicrosoftAccount | MojangAccount | OfflineAccount

export type Accounts = Record<string, Account>

export interface AccountsContext {
  accounts: Accounts
  setAccounts: (newAccounts: Accounts) => void
}

const accountsContext = React.createContext<AccountsContext>({
  accounts: {},
  setAccounts: () => {
    /* no-op */
  },
})

export default accountsContext
