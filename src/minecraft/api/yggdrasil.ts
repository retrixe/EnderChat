const agent = { name: 'Minecraft', version: 1 }

interface AuthenticateResponse {
  accessToken: string
  clientToken: string
  user?: {
    id: string
    username: string
    properties: { name: string; value: string }[]
  }
  selectedProfile: { id: string; name: string }
  availableProfiles: { id: string; name: string }[]
}

export const authenticate = async (
  username: string,
  password: string,
  requestUser = false,
  clientToken?: string,
): Promise<AuthenticateResponse> => {
  const request = await fetch('https://authserver.mojang.com/authenticate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(
      clientToken
        ? { agent, username, password, clientToken, requestUser }
        : { agent, username, password, requestUser },
    ),
  })
  if (!request.ok) {
    throw new MojangError((await request.json()) as MojangErrorInterface)
  }
  return (await request.json()) as AuthenticateResponse
}

interface RefreshResponse {
  accessToken: string
  clientToken: string
  user?: { id: string; properties: { name: string; value: string }[] }
}

export const refresh = async (
  accessToken: string,
  clientToken: string,
  requestUser = false,
): Promise<RefreshResponse> => {
  const request = await fetch('https://authserver.mojang.com/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accessToken, clientToken, requestUser }),
  })
  if (!request.ok) {
    throw new MojangError((await request.json()) as MojangErrorInterface)
  }
  return (await request.json()) as RefreshResponse
}

export const validate = async (accessToken: string, clientToken?: string): Promise<void> => {
  const request = await fetch('https://authserver.mojang.com/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(clientToken ? { accessToken, clientToken } : { accessToken }),
  })
  if (!request.ok) {
    throw new MojangError((await request.json()) as MojangErrorInterface)
  }
}

export const signout = async (username: string, password: string): Promise<void> => {
  const request = await fetch('https://authserver.mojang.com/signout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!request.ok) {
    throw new MojangError((await request.json()) as MojangErrorInterface)
  }
}

export const invalidate = async (accessToken: string, clientToken: string): Promise<void> => {
  const request = await fetch('https://authserver.mojang.com/invalidate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accessToken, clientToken }),
  })
  if (!request.ok) {
    throw new MojangError((await request.json()) as MojangErrorInterface)
  }
}

interface MojangErrorInterface {
  error: string
  errorMessage: string
  cause?: string
}

export class MojangError extends Error {
  error = ''
  cause = ''

  constructor(response: MojangErrorInterface) {
    super(response.errorMessage)
    this.error = response.error
    this.cause = response.cause ?? ''
  }
}
