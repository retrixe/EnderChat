import { createContext, useContext } from 'react'

export const ColorSchemeContext = createContext<boolean>(false)

const useDarkMode = () => useContext(ColorSchemeContext)

export default useDarkMode
