import React, { useState } from 'react'
import { StyleSheet, View, Switch, Pressable } from 'react-native'

import TextFieldDialog from '../TextFieldDialog'
import globalStyle from '../../globalStyle'
import Text from '../Text'
import useDarkMode from '../../context/useDarkMode'

const Setting = <T extends string | boolean>({
  name,
  value,
  onClick,
  setValue,
  multiline,
  maxLength
}: {
  name: string
  value: T
  onClick?: () => void
  setValue?: (newValue: T) => void
  multiline?: boolean
  maxLength?: number
}) => {
  const da = useDarkMode()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState(
    typeof value === 'string' ? value : ''
  )
  // This is used for toggles because the upper value is not updated immediately, resulting in judder.
  const [toggleValue, setToggleValue] = useState(value)

  const Wrapper = setValue || onClick ? Pressable : React.Fragment
  const wrapperPress = () => {
    if (onClick) onClick()
    else if (typeof value === 'boolean' && setValue) {
      setValue(!toggleValue as T)
      setToggleValue(!toggleValue as T)
    } else if (typeof value === 'string' && setValue && !modalOpen) {
      setModalOpen(true)
      setModalContent(value)
    }
  }

  return (
    <Wrapper
      {...(setValue || onClick
        ? { onPress: wrapperPress, android_ripple: { color: '#aaa' } }
        : {})}
    >
      {typeof value === 'string' && setValue && (
        <TextFieldDialog
          name={name}
          maxLength={maxLength}
          placeholder={name}
          multiline={multiline}
          modalOpen={modalOpen}
          initialState={modalContent}
          closeModal={() => setModalOpen(false)}
          setFinalState={response => setValue(response as T)}
        />
      )}
      <View
        style={
          typeof value === 'string' ? styles.setting : styles.settingWithSwitch
        }
      >
        <Text style={styles.settingText}>{name}</Text>
        {typeof value === 'string' && (
          <Text style={da ? styles.settingSubtextDark : styles.settingSubtext}>
            {value || 'N/A'}
          </Text>
        )}
        {typeof toggleValue === 'boolean' && (
          <>
            <View style={globalStyle.flexSpacer} />
            <Switch value={toggleValue} onValueChange={wrapperPress} />
          </>
        )}
      </View>
    </Wrapper>
  )
}

const styles = StyleSheet.create({
  setting: { padding: 12, paddingLeft: 22, paddingRight: 22 },
  settingWithSwitch: {
    padding: 12,
    paddingLeft: 22,
    paddingRight: 22,
    flexDirection: 'row',
    alignItems: 'center'
  },
  settingText: { fontSize: 18 },
  settingSubtext: { fontSize: 12, fontWeight: '400', color: '#666' },
  settingSubtextDark: { fontSize: 12, fontWeight: '400', color: '#aaa' }
})

export default Setting
