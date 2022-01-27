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
  // https://github.com/facebook/react-native/issues/15114#issuecomment-364458149
  darkMode: { color: '#ffffff', fontFamily: '' },
  lightMode: { color: '#000000', fontFamily: '' }
})

export default Text
