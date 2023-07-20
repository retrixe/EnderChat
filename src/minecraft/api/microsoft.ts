export const loginUrl =
  'https://login.live.com/oauth20_authorize.srf' +
  '?client_id={CLIENT_ID}' +
  '&response_type=code' +
  '&scope={SCOPE}' +
  '&redirect_uri=https%3A%2F%2Flogin.live.com%2Foauth20_desktop.srf'
export const redirectUrlPrefix =
  'https://login.live.com/oauth20_desktop.srf?code='
const authTokenUrl = 'https://login.live.com/oauth20_token.srf'
const redirectUri = 'https://login.live.com/oauth20_desktop.srf'
const xblAuthUrl = 'https://user.auth.xboxlive.com/user/authenticate'
const xstsAuthUrl = 'https://xsts.auth.xboxlive.com/xsts/authorize'
const mcLoginUrl =
  'https://api.minecraftservices.com/authentication/login_with_xbox'
const mcStoreUrl = 'https://api.minecraftservices.com/entitlements/mcstore'
const mcProfileUrl = 'https://api.minecraftservices.com/minecraft/profile'

export const getMSAuthToken = async (
  authorizationCode: string,
  clientId: string,
  scope: string
): Promise<[string, string]> => {
  const body = `client_id=${clientId}
 &scope=${encodeURIComponent(scope)}
 &code=${encodeURIComponent(authorizationCode)}
 &grant_type=authorization_code
 &redirect_uri=${encodeURIComponent(redirectUri)}`
  const req = await fetch(authTokenUrl, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  if (!req.ok) throw new Error('Failed to request auth token from Microsoft!')
  const res = await req.json()
  // { "expires_in":86400 }
  return [res.access_token, res.refresh_token]
}

export const refreshMSAuthToken = async (
  refreshToken: string,
  clientId: string,
  scope: string
): Promise<[string, string]> => {
  const body = `client_id=${clientId}
 &scope=${encodeURIComponent(scope)}
 &refresh_token=${encodeURIComponent(refreshToken)}
 &grant_type=refresh_token
 &redirect_uri=${encodeURIComponent(redirectUri)}`
  const req = await fetch(authTokenUrl, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  if (!req.ok) throw new Error('Failed to request auth token from Microsoft!')
  const res = await req.json()
  // { "expires_in":86400 }
  return [res.access_token, res.refresh_token]
}

export const getXboxLiveTokenAndUserHash = async (
  authToken: string
): Promise<[string, string]> => {
  const req = await fetch(xblAuthUrl, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    method: 'POST',
    body: JSON.stringify({
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: authToken // sometimes it needs t= or d= prefix lol
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT'
    })
  })
  if (!req.ok) throw new Error('Failed to request auth token from Xbox Live!')
  const res = await req.json()
  // {"IssueInstant":"2020-12-07T19:52:08.4463796Z", "NotAfter":"2020-12-21T19:52:08.4463796Z"}
  return [res.Token, res.DisplayClaims.xui[0].uhs]
}

export const getXstsTokenAndUserHash = async (
  xboxLiveToken: string
): Promise<[string, string]> => {
  const req = await fetch(xstsAuthUrl, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    method: 'POST',
    body: JSON.stringify({
      Properties: { SandboxId: 'RETAIL', UserTokens: [xboxLiveToken] },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT'
    })
  })
  if (req.status === 401) throw new XstsError(await req.json())
  if (!req.ok) throw new Error('Failed to request XSTS token from Xbox Live!')
  const res = await req.json()
  // {"IssueInstant":"2020-12-07T19:52:08.4463796Z", "NotAfter":"2020-12-21T19:52:08.4463796Z"}
  return [res.Token, res.DisplayClaims.xui[0].uhs]
}

export const authenticateWithXsts = async (
  xstsToken: string,
  xboxUserHash: string
): Promise<string> => {
  const req = await fetch(mcLoginUrl, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    method: 'POST',
    body: JSON.stringify({
      identityToken: `XBL3.0 x=${xboxUserHash};${xstsToken}`
    })
  })
  if (!req.ok) throw new Error('Failed to authenticate with Mojang via MSA!')
  const res = await req.json()
  // {"expires_in":86400}
  return res.access_token
}

export const checkGameOwnership = async (accessToken: string) => {
  const req = await fetch(mcStoreUrl, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  })
  if (!req.ok) throw new Error('Failed to check if user owns Minecraft game!')
  const res = await req.json()
  const items = res.items as Array<{ name: string }>
  return (
    items?.length >= 2 &&
    items.find(item => item.name === 'game_minecraft') &&
    items.find(item => item.name === 'product_minecraft')
  )
}

export const getGameProfile = async (
  accessToken: string
): Promise<{
  id: string
  name: string
  capes: Array<{
    id: string
    url: string
    alias?: string
    state?: 'ACTIVE'
  }>
  skins: Array<{
    id: string
    url: string
    state?: 'ACTIVE'
    alias?: 'STEVE' | 'ALEX'
    variant: 'CLASSIC' | 'SLIM'
  }>
}> => {
  const req = await fetch(mcProfileUrl, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  })
  if (!req.ok && req.status !== 404) {
    throw new Error('Failed to check if user owns Minecraft game!')
  }
  const res = await req.json()
  if (
    res.error === 'NOT_FOUND' &&
    res.errorMessage ===
      'The server has not found anything matching the request URI'
  ) {
    throw new Error('This user does not own Minecraft!')
  }
  return res
}

export const XstsErrorCodes: Record<string, string> = {
  2148916235:
    'The account is from a country where Xbox Live is not available/banned.',
  2148916238:
    'The account is a child (under 18) and cannot proceed unless the account is added to' +
    ' a Family by an adult. This only seems to occur when using a custom Microsoft Azure' +
    " application. When using the Minecraft launchers client id, this doesn't trigger.",
  2148916233:
    "The account doesn't have an Xbox account. Once they sign up for one" +
    ' (or login through minecraft.net to create one) then they can proceed with the login.' +
    " This shouldn't happen with accounts that have purchased Minecraft with a Microsoft" +
    " account, as they would've already gone through that Xbox signup process."
}

export class XstsError extends Error {
  Code = 401
  XErrMessage = 'No details available.'
  XErr: string | '2148916233' | '2148916235' | '2148916238' = ''
  constructor(response: { XErr: string; Code: number; Message: string }) {
    super(response.Message)
    this.XErr = response.XErr
    this.Code = response.Code
    this.XErrMessage = XstsErrorCodes[this.XErr] || 'No details available.'
  }
}
