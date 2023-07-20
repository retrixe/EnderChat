import React from 'react'
import { TextInput, StyleSheet, type TextInputProps } from 'react-native'
import useDarkMode from '../context/useDarkMode'

const TextField = (props: TextInputProps & { red?: boolean }) => {
  const style = props.style?.valueOf()
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
        ...(props.red ? { borderColor: '#ff0000', borderWidth: 1 } : {}),
        ...(typeof style === 'object' ? style : {})
      }}
    />
  )
}

const styles = StyleSheet.create({
  modalTextField: {
    height: 40,
    marginTop: 8,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4
    // borderWidth: 1
  },
  modalMultilineField: {
    height: 60,
    padding: 4,
    marginTop: 8,
    paddingLeft: 8,
    paddingRight: 8
    // borderWidth: 1
  },
  modalTextFieldBackground: {
    backgroundColor: '#f0f0f0', // fafafa
    // borderColor: '#efefef',
    borderRadius: 6,
    color: '#000'
  },
  modalTextFieldBackgroundDark: {
    backgroundColor: '#121212', // 363636
    // borderColor: '#121212',
    borderRadius: 6,
    color: '#fff'
  }
})

export default TextField
