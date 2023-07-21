import { createContext, useContext } from 'react'

export const ColorSchemeContext = createContext<boolean>(false)

const useDarkMode = (): boolean => useContext(ColorSchemeContext)

export default useDarkMode
