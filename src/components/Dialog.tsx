import React from 'react'
import {
  Modal,
  Pressable,
  type ViewStyle,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import useDarkMode from '../context/useDarkMode'

const Dialog = ({
  visible,
  children,
  onRequestClose,
  containerStyles,
}: React.PropsWithChildren<{
  visible: boolean
  onRequestClose: () => void
  containerStyles?: ViewStyle
}>): React.JSX.Element => (
  <Modal
    animationType='fade'
    transparent
    visible={visible}
    statusBarTranslucent
    onRequestClose={onRequestClose}
  >
    <Pressable style={styles.modalView} onPress={onRequestClose}>
      <KeyboardAvoidingView
        enabled={
          /*
            We have windowSoftInputMode=adjustResize in the manifest, and leaving it enabled causes
            https://github.com/facebook/react-native/issues/29614
          */
          Platform.OS !== 'android'
        }
        behavior='padding'
        style={styles.kaView}
      >
        {/* Use Pressable to opt-out. */}
        <Pressable
          style={[
            styles.modalContainer,
            useDarkMode() ? styles.modalContainerDark : {},
            ...(Array.isArray(containerStyles) ? containerStyles : [containerStyles]),
          ]}
        >
          {children}
        </Pressable>
      </KeyboardAvoidingView>
    </Pressable>
  </Modal>
)

const styles = StyleSheet.create({
  modalView: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kaView: {
    width: '80%',
  },
  modalContainer: {
    zIndex: 50,
    padding: 16,
    elevation: 2,
    borderRadius: 4,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  modalContainerDark: { backgroundColor: '#333' },
})

export const dialogStyles = StyleSheet.create({
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  modalButtons: { flexDirection: 'row' },
  modalButton: { marginTop: 8, padding: 8 },
  modalButtonText: { fontWeight: 'bold', color: '#008080' },
  modalButtonCancelText: { fontWeight: 'bold', color: '#666' },
  modalButtonCancelDarkText: { fontWeight: 'bold', color: '#cacaca' },
})

export default Dialog
