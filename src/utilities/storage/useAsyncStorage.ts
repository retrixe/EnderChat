import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

type SetAsyncStorage = (value: string) => void

const useAsyncStorage = (name: string, defaultValue = ''): [string, SetAsyncStorage] => {
  const [state, setState] = useState(defaultValue)

  useEffect(() => {
    AsyncStorage.getItem(name)
      .then(res => setState(res ?? defaultValue))
      .catch((err: unknown) => console.error(err))
  }, [name, defaultValue])

  return [
    state,
    (value: string) => {
      setState(value)
      AsyncStorage.setItem(name, value).catch((err: unknown) => console.error(err))
    },
  ]
}

export default useAsyncStorage
