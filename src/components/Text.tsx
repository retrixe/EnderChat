import React from 'react'
import {
  Text as RNText,
  type TextProps,
  StyleSheet,
  Platform
} from 'react-native'
import useDarkMode from '../context/useDarkMode'

const Text = (props: React.PropsWithChildren<TextProps>): JSX.Element => (
  <RNText
    {...props}
    style={[
      Platform.OS === 'android' ? styles.androidFontFix : {},
      useDarkMode() ? styles.darkMode : styles.lightMode,
      ...(Array.isArray(props.style) ? props.style : [props.style])
    ]}
  />
)

const styles = StyleSheet.create({
  darkMode: { color: '#ffffff' },
  lightMode: { color: '#000000' },
  // https://github.com/facebook/react-native/issues/15114#issuecomment-364458149
  androidFontFix: { fontFamily: '' }
})

export default Text
