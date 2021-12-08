import React from 'react'
import { TextInput, StyleSheet, TextInputProps } from 'react-native'
import useDarkMode from '../context/useDarkMode'

// TODO: Look into a redesign.
const TextField = (props: TextInputProps & { red?: boolean }) => {
  const style = props.style && props.style.valueOf()
  const darkMode = useDarkMode()
  return (
    <TextInput
      textAlignVertical='top'
      numberOfLines={props.multiline ? 3 : 1}
      placeholderTextColor={darkMode ? '#aaa' : '#888'}
      {
        ...props /* Spreads value, placeholder, multiline and onChangeText. */
      }
      style={{
        ...(props.multiline
          ? styles.modalMultilineField
          : styles.modalTextField),
        ...(darkMode
          ? styles.modalTextFieldBackgroundDark
          : styles.modalTextFieldBackground),
        ...(props.red ? { borderColor: '#ff0000' } : {}),
        ...(typeof style === 'object' ? style : {})
      }}
    />
  )
}

const styles = StyleSheet.create({
  modalTextField: {
    height: 40,
    marginTop: 8,
    borderWidth: 1
  },
  modalMultilineField: {
    height: 60,
    padding: 4,
    marginTop: 8,
    borderWidth: 1
  },
  modalTextFieldBackground: {
    backgroundColor: '#fafafa',
    borderColor: '#efefef',
    color: '#000'
  },
  modalTextFieldBackgroundDark: {
    backgroundColor: '#363636',
    borderColor: '#121212',
    color: '#fff'
  }
})

export default TextField
