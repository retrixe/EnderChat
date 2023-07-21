import React, { useState } from 'react'
import { View, Pressable } from 'react-native'
import Dialog, { dialogStyles as styles } from './Dialog'
import Text from './Text'
import TextField from './TextField'
import globalStyle from '../globalStyle'
import useDarkMode from '../context/useDarkMode'

const TextFieldDialog = ({
  name,
  multiline,
  maxLength,
  modalOpen,
  closeModal,
  placeholder,
  initialState,
  setFinalState
}: {
  name: string
  modalOpen: boolean
  maxLength?: number
  multiline?: boolean
  placeholder: string
  closeModal: () => void
  initialState: string
  setFinalState: (state: string) => void
}): JSX.Element => {
  const [modalContent, setModalContent] = useState(initialState)
  const closeModalAndSaveState = (): void => {
    setFinalState(modalContent)
    closeModal()
  }
  const closeModalAndReset = (): void => {
    setModalContent(initialState)
    closeModal()
  }

  return (
    <Dialog visible={modalOpen} onRequestClose={closeModalAndSaveState}>
      <Text style={styles.modalTitle}>{name}</Text>
      <TextField
        value={modalContent}
        maxLength={maxLength}
        multiline={multiline}
        placeholder={placeholder}
        onChangeText={setModalContent}
      />
      <View style={styles.modalButtons}>
        <View style={globalStyle.flexSpacer} />
        <Pressable
          android_ripple={{ color: '#aaa' }}
          style={styles.modalButton}
          onPress={closeModalAndReset}
        >
          <Text
            style={
              useDarkMode()
                ? styles.modalButtonCancelDarkText
                : styles.modalButtonCancelText
            }
          >
            CANCEL
          </Text>
        </Pressable>
        <Pressable
          android_ripple={{ color: '#aaa' }}
          style={styles.modalButton}
          onPress={closeModalAndSaveState}
        >
          <Text style={styles.modalButtonText}>DONE</Text>
        </Pressable>
      </View>
    </Dialog>
  )
}

export default TextFieldDialog
