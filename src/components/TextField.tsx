import React from 'react'
import { TextInput, StyleSheet, TextInputProps } from 'react-native'

const TextField = (props: TextInputProps & { red?: boolean }) => {
  const style = props.style && props.style.valueOf()
  return (
    <TextInput
      textAlignVertical='top'
      numberOfLines={props.multiline ? 3 : 1}
      {
        ...props /* Spreads value, placeholder, multiline and onChangeText. */
      }
      style={{
        ...(props.multiline
          ? styles.modalMultilineField
          : styles.modalTextField),
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
    borderWidth: 1,
    borderColor: '#efefef',
    backgroundColor: '#fafafa'
  },
  modalMultilineField: {
    height: 60,
    padding: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#efefef',
    backgroundColor: '#fafafa'
  }
})

export default TextField
