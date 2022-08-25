import { Accounts } from '../../context/accountsContext'
import { Connection, DisconnectReason } from '../../context/connectionContext'
import { Sessions, SetSession } from '../../context/sessionStore'
import { Servers } from '../../context/serversContext'
import { Settings } from '../../context/settingsContext'
import {
  authenticateWithXsts,
  getXboxLiveTokenAndUserHash,
  getXstsTokenAndUserHash,
  refreshMSAuthToken
} from '../../minecraft/api/microsoft'
import { getPlayerCertificates } from '../../minecraft/api/mojang'
import { refresh } from '../../minecraft/api/yggdrasil'
import { parseValidJson } from '../../minecraft/chatToJsx'
import initiateConnection from '../../minecraft/connection'
import { parseIp, protocolMap, resolveHostname } from '../../minecraft/utils'
import config from '../../../config.json'

export const createConnection = async (
  server: string,
  version: number,
  servers: Servers,
  settings: Settings,
  accounts: Accounts,
  sessions: Sessions,
  setSession: SetSession,
  setAccounts: (accs: Accounts) => void,
  setConnection: (conn?: Connection) => void,
  setDisconnectReason: (reason: DisconnectReason) => void,
  closeChatScreen: () => void
): Promise<Connection | DisconnectReason> => {
  const [hostname, portNumber] = parseIp(servers[server].address)
  const [host, port] = await resolveHostname(hostname, portNumber)
  const activeAccount = Object.keys(accounts).find(e => accounts[e].active)
  if (!activeAccount) {
    closeChatScreen()
    return {
      server,
      reason:
        'No active account selected! Open the Accounts tab and add an account.'
    }
  }
  const uuid = accounts[activeAccount].type ? activeAccount : undefined
  // Create an updated "session" containing access tokens and certificates.
  let session = sessions[activeAccount]
  const is119 = version >= protocolMap[1.19]
  if (uuid && (!session || (!session.certificate && is119))) {
    // LOW-TODO: Certificates and access tokens should be updated regularly.
    // We should probably lock access to them via a semaphore.
    try {
      // Create a session with the latest access token.
      const account = accounts[activeAccount]
      if (!session && accounts[activeAccount].type === 'microsoft') {
        const [msAccessToken, msRefreshToken] = await refreshMSAuthToken(
          accounts[activeAccount].microsoftRefreshToken || '',
          config.clientId,
          config.scope
        )
        const [xlt, xuh] = await getXboxLiveTokenAndUserHash(msAccessToken)
        const [xstsToken] = await getXstsTokenAndUserHash(xlt)
        const accessToken = await authenticateWithXsts(xstsToken, xuh)
        session = { accessToken }
        setAccounts({
          [activeAccount]: {
            ...account,
            accessToken,
            microsoftAccessToken: msAccessToken,
            microsoftRefreshToken: msRefreshToken
          }
        })
      } else if (!session && accounts[activeAccount].type === 'mojang') {
        const { accessToken, clientToken } = await refresh(
          accounts[activeAccount].accessToken || '',
          accounts[activeAccount].clientToken || '',
          false
        )
        session = { accessToken }
        setAccounts({
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
      closeChatScreen()
      const reason =
        'Failed to create session! You may need to re-login with your Microsoft Account in the Accounts tab.'
      return { server, reason }
    }
  }

  // Connect to server after setting up the session.
  try {
    const newConn = await initiateConnection({
      host,
      port,
      username: accounts[activeAccount].username,
      protocolVersion: version,
      selectedProfile: uuid,
      accessToken: session?.accessToken,
      certificate: settings.enableChatSigning ? session?.certificate : undefined
    })
    const onCloseOrError = () => {
      closeChatScreen()
      setConnection(undefined)
      if (newConn.disconnectReason) {
        const reason = parseValidJson(newConn.disconnectReason)
        setDisconnectReason({ server, reason })
      }
    }
    newConn.on('close', onCloseOrError)
    newConn.on('error', onCloseOrError)
    return { serverName: server, connection: newConn }
  } catch (e) {
    closeChatScreen()
    return { server, reason: 'Failed to connect to server!' }
  }
}
