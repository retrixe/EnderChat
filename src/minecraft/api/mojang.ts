const joinMinecraftSessionUrl = 'https://sessionserver.mojang.com/session/minecraft/join'
const getPlayerCertificatesUrl = 'https://api.minecraftservices.com/player/certificates'

export interface Certificate {
  keyPair: {
    // -----BEGIN RSA PUBLIC KEY-----\n ... \n-----END RSA PUBLIC KEY-----\n
    publicKey: string
    // -----BEGIN RSA PRIVATE KEY-----\n ... \n-----END RSA PRIVATE KEY-----\n
    privateKey: string
  }
  publicKeySignature: string // [Base64 string; signed data]
  refreshedAfter: string // 2022-04-29T16:11:32.174783069Z
  expiresAt: string // 2022-04-30T00:11:32.174783069Z
}

export const joinMinecraftSession = async (
  accessToken: string,
  selectedProfile: string,
  serverId: string,
): Promise<Response> =>
  await fetch(joinMinecraftSessionUrl, {
    body: JSON.stringify({ accessToken, selectedProfile, serverId }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

export const getPlayerCertificates = async (accessToken: string): Promise<Certificate> =>
  await fetch(getPlayerCertificatesUrl, {
    headers: { Authorization: 'Bearer ' + accessToken },
    method: 'POST',
  }).then(async res => (await res.json()) as Certificate)
