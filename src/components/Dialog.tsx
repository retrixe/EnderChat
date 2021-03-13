import React from 'react'
import {
  Modal,
  Pressable,
  ViewStyle,
  StyleSheet,
  KeyboardAvoidingView
} from 'react-native'

const Dialog = ({
  visible,
  children,
  onRequestClose,
  containerStyles
}: React.PropsWithChildren<{
  visible: boolean
  onRequestClose: () => void
  containerStyles?: ViewStyle
}>) => (
  <Modal
    animationType='fade'
    transparent
    visible={visible}
    statusBarTranslucent
    onRequestClose={onRequestClose}
  >
    <KeyboardAvoidingView style={styles.kaView} enabled behavior='padding'>
      <Pressable style={styles.modalView} onPress={onRequestClose}>
        {/* Use Pressable to opt-out. */}
        <Pressable style={{ ...styles.modalContainer, ...containerStyles }}>
          {children}
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  </Modal>
)

const styles = StyleSheet.create({
  kaView: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalContainer: {
    width: '80%',
    padding: 16,
    elevation: 2,
    borderRadius: 4,
    paddingBottom: 8,
    backgroundColor: '#fff'
  }
})

export const dialogStyles = StyleSheet.create({
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  modalButtons: { flexDirection: 'row' },
  modalButton: { marginTop: 8, padding: 8 },
  modalButtonText: { fontWeight: 'bold', color: '#008080' },
  modalButtonCancelText: { fontWeight: 'bold', color: '#666' }
})

export default Dialog
