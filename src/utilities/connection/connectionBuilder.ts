import { type Accounts } from '../../context/accountsContext'
import { type DisconnectReason } from '../../context/connectionContext'
import {
  type Session,
  type Sessions,
  type SetSession
} from '../../context/sessionStore'
import { type Servers } from '../../context/serversContext'
import { type Settings } from '../../context/settingsContext'
import {
  authenticateWithXsts,
  getXboxLiveTokenAndUserHash,
  getXstsTokenAndUserHash,
  refreshMSAuthToken
} from '../../minecraft/api/microsoft'
import { getPlayerCertificates } from '../../minecraft/api/mojang'
import { refresh } from '../../minecraft/api/yggdrasil'
import { parseJsonChat } from '../../minecraft/chatToJsx'
import initiateConnection, {
  type ServerConnection
} from '../../minecraft/connection'
import { parseIp, protocolMap, resolveHostname } from '../../minecraft/utils'
import config from '../../../config.json'

export const getSession = async (
  version: number,
  accounts: Accounts,
  sessions: Sessions,
  setSession: SetSession,
  setLoading: (msg: string) => void,
  setAccounts: (accs: Accounts) => void
): Promise<Session | string> => {
  const activeAccount = Object.keys(accounts).find(e => accounts[e].active)
  if (!activeAccount) {
    return 'No active account selected! Open the Accounts tab and add an account.'
  }
  const uuid = accounts[activeAccount].type ? activeAccount : undefined

  // Create an updated "session" containing access tokens and certificates.
  let session = sessions[activeAccount]
  const is119 = version >= protocolMap[1.19]
  // TODO: We should store session store in a persistent cache.
  // Certificates and access tokens should be updated regularly.
  if (uuid && (!session || (!session.certificate && is119))) {
    // We should probably lock access to them via a semaphore.
    try {
      // Create a session with the latest access token.
      const account = accounts[activeAccount]
      if (!session && accounts[activeAccount].type === 'microsoft') {
        setLoading('Reloading your Microsoft Account...')
        const [msAccessToken, msRefreshToken] = await refreshMSAuthToken(
          accounts[activeAccount].microsoftRefreshToken ?? '',
          config.clientId,
          config.scope
        )
        const [xlt, xuh] = await getXboxLiveTokenAndUserHash(msAccessToken)
        const [xstsToken] = await getXstsTokenAndUserHash(xlt)
        const accessToken = await authenticateWithXsts(xstsToken, xuh)
        session = { accessToken }
        setAccounts({
          ...accounts,
          [activeAccount]: {
            ...account,
            accessToken,
            microsoftAccessToken: msAccessToken,
            microsoftRefreshToken: msRefreshToken
          }
        })
      } else if (!session && accounts[activeAccount].type === 'mojang') {
        setLoading('Reloading your Mojang Account...')
        const { accessToken, clientToken } = await refresh(
          accounts[activeAccount].accessToken ?? '',
          accounts[activeAccount].clientToken ?? '',
          false
        )
        session = { accessToken }
        setAccounts({
          ...accounts,
          [activeAccount]: { ...account, accessToken, clientToken }
        })
      }
      // If connecting to 1.19, get player certificates.
      if (!session.certificate && is119) {
        const token = session.accessToken
        session.certificate = await getPlayerCertificates(token)
      }
      setSession(activeAccount, session)
    } catch (e) {
      return 'Failed to create session! You may need to re-login with your Microsoft Account in the Accounts tab.'
    }
  }
  return session
}

export const createConnection = async (
  server: string,
  version: number,
  servers: Servers,
  session: Session | undefined,
  settings: Settings,
  accounts: Accounts,
  setConnection: (conn?: ServerConnection) => void,
  closeChatScreen: (reason?: DisconnectReason) => void
): Promise<ServerConnection | string> => {
  let host: string
  let port: number
  try {
    const [hostname, portNumber] = parseIp(servers[server].address)
    ;[host, port] = await resolveHostname(hostname, portNumber)
  } catch (e) {
    return 'Failed to resolve server hostname!'
  }

  const activeAccount = Object.keys(accounts).find(e => accounts[e].active)
  if (!activeAccount) {
    return 'No active account selected! Open the Accounts tab and add an account.'
  }
  const uuid = accounts[activeAccount].type ? activeAccount : undefined

  try {
    const newConn = await initiateConnection({
      serverName: server,
      host,
      port,
      username: accounts[activeAccount].username,
      protocolVersion: version,
      selectedProfile: uuid,
      accessToken: session?.accessToken,
      certificate: settings.enableChatSigning ? session?.certificate : undefined
    })
    const onCloseOrError = (): void => {
      closeChatScreen(
        newConn.disconnectReason
          ? { server, reason: parseJsonChat(newConn.disconnectReason) }
          : undefined
      )
      setConnection(undefined)
    }
    newConn.on('close', onCloseOrError)
    newConn.on('error', onCloseOrError)
    return newConn
  } catch (e) {
    console.error(e)
    return 'Failed to connect to server!'
  }
}
