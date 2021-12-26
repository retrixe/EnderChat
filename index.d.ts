declare module 'react-native-tcp' {
  import * as net from 'net'
  export = net
}
declare module 'react-native-crypto' {
  import * as crypto from 'crypto'
  export = crypto
}
declare module 'react-native-randombytes' {
  export function randomBytes(
    size: number,
    callback: (err: Error | null, buf: Buffer) => void
  ): void
}
declare module 'react-native-aes-crypto' {
  export type Algorithms = 'aes-128-cbc' | 'aes-192-cbc' | 'aes-256-cbc'
  export function pbkdf2(
    password: string,
    salt: string,
    cost: number,
    length: number
  ): Promise<string>
  export function encrypt(
    text: string,
    key: string,
    iv: string,
    algorithm: Algorithms
  ): Promise<string>
  export function decrypt(
    ciphertext: string,
    key: string,
    iv: string,
    algorithm: Algorithms
  ): Promise<string>
  export function hmac256(ciphertext: string, key: string): Promise<string>
  export function hmac512(ciphertext: string, key: string): Promise<string>
  export function randomKey(length: number): Promise<string>
  export function sha1(text: string): Promise<string>
  export function sha256(text: string): Promise<string>
  export function sha512(text: string): Promise<string>
}
