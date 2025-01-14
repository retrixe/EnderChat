import { create } from 'zustand'
import type { Certificate } from '../minecraft/api/mojang'

export interface Session {
  certificate?: Certificate
  accessToken: string
}

export type Sessions = Record<string, Session>

export type SetSession = (uuid: string, session: Session) => void

const useSessionStore = create<{
  sessions: Sessions
  setSession: SetSession
}>(set => ({
  sessions: {},
  setSession: (uuid: string, session: Session) =>
    set(state => ({ sessions: { ...state.sessions, [uuid]: session } })),
}))

export default useSessionStore
