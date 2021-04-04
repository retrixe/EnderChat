import React from 'react'
import { Text as RNText, TextProps, StyleSheet } from 'react-native'
import useDarkMode from '../context/useDarkMode'

const Text = (props: React.PropsWithChildren<TextProps>) => (
  <RNText
    {...props}
    style={[
      useDarkMode() ? styles.darkMode : styles.lightMode,
      ...(Array.isArray(props.style) ? props.style : [props.style])
    ]}
  />
)

const styles = StyleSheet.create({
  darkMode: { color: '#ffffff' },
  lightMode: { color: '#000000' }
})

export default Text
