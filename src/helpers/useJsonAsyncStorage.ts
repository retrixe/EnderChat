import { useState, useEffect, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

type SetJsonAsyncStorage<T> = (value: Partial<T>) => void

const useMemoisedValue = <T>(value: T) => {
  const ref = useRef<T>(value)
  if (JSON.stringify(value) !== JSON.stringify(ref.current)) ref.current = value
  return ref.current
}

// This does not support deep merge, do not use it for deep merging.
// This also requires JSON compatible objects to be passed.
const useJsonAsyncStorage = <T extends {}>(
  name: string,
  passedDefaultValue: T
): [T, SetJsonAsyncStorage<T>] => {
  const defaultValue = useMemoisedValue(passedDefaultValue)
  const [state, setState] = useState(defaultValue)

  useEffect(() => {
    AsyncStorage.getItem(name)
      .then(res => {
        if (!res) return defaultValue
        setState({ ...defaultValue, ...JSON.parse(res) })
      })
      .catch(err => console.error(err))
  }, [name, defaultValue])

  return [
    state,
    (value: Partial<T>) => {
      const merge = { ...state, ...value }
      setState(merge)
      AsyncStorage.setItem(name, JSON.stringify(merge)).catch(err =>
        console.error(err)
      )
    }
  ]
}

export default useJsonAsyncStorage
