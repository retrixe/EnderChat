import { useState, useEffect, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

type SetJsonAsyncStorage<T> = (value: Partial<T>) => void

const useMemoisedValue = <T>(value: T): T => {
  const ref = useRef<T>(value)
  if (JSON.stringify(value) !== JSON.stringify(ref.current)) ref.current = value
  return ref.current
}

// This function requires JSON compatible objects to be passed.
// This does not support deep merge, do not use it for nested objects.
const useJsonAsyncStorage = <T>(
  name: string,
  defaultValue: T,
  ignoreUnknownKeys = false,
): [T, SetJsonAsyncStorage<T>] => {
  const defaultValueMemo = useMemoisedValue(defaultValue)
  const [state, setState] = useState(defaultValueMemo)

  useEffect(() => {
    AsyncStorage.getItem(name)
      .then(res => {
        if (res) {
          if (ignoreUnknownKeys) {
            const parsed = JSON.parse(res) as T
            const newValue = { ...defaultValueMemo }
            // Remove any values that aren't present in defaultValue.
            for (const key in parsed) {
              if (Object.prototype.hasOwnProperty.call(newValue, key)) {
                newValue[key] = parsed[key]
              }
            }
            setState(newValue)
          } else setState({ ...defaultValueMemo, ...JSON.parse(res) })
        }
      })
      .catch((err: unknown) => console.error(err))
  }, [name, defaultValueMemo, ignoreUnknownKeys])

  return [
    state,
    (value: Partial<T>) => {
      const merge = { ...state, ...value }
      AsyncStorage.setItem(name, JSON.stringify(merge))
        .then(() => setState(merge))
        .catch((err: unknown) => console.error(err))
    },
  ]
}

export default useJsonAsyncStorage
