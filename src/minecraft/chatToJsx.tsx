import React from 'react'
import type { StyleProp, TextProps, TextStyle } from 'react-native'
import translationsJson from './translations.json'

const translations: Record<string, string> = translationsJson
// Keybinds are not supported in EnderChat, so we'll just display the keybind as text in keybindChat

export const mojangColorMap: ColorMap = {
  black: '#000000',
  dark_blue: '#0000AA',
  dark_green: '#00AA00',
  dark_aqua: '#00AAAA',
  dark_red: '#AA0000',
  dark_purple: '#AA00AA',
  gold: '#FFAA00',
  gray: '#AAAAAA',
  dark_gray: '#555555',
  blue: '#5555FF',
  green: '#55FF55',
  aqua: '#55FFFF',
  red: '#FF5555',
  light_purple: '#FF55FF',
  yellow: '#FFFF55',
  white: '#FFFFFF',
}

export const lightColorMap: ColorMap = {
  ...mojangColorMap,
  white: '#000000',
  green: '#55c855',
  gray: '#999999',
  yellow: '#b9b955',
  aqua: '#55cdcd',
}

export interface ColorMap {
  [color: string]: string
  black: string
  dark_blue: string
  dark_green: string
  dark_aqua: string
  dark_red: string
  dark_purple: string
  gold: string
  gray: string
  dark_gray: string
  blue: string
  green: string
  aqua: string
  red: string
  light_purple: string
  yellow: string
  white: string
}

export interface BaseChat {
  bold?: boolean
  color?: string
  italic?: boolean
  obfuscated?: boolean
  underlined?: boolean
  strikethrough?: boolean
  extra?: MinecraftChat[]
  insertion?: string // LOW-TODO: Support this.
  clickEvent?: ClickEvent
  hoverEvent?: HoverEvent
  type?: 'text' | 'translatable' | 'score' | 'keybind' | 'nbt' // LOW-TODO: Support keybind and score
}

export interface PlainTextChat extends BaseChat {
  text?: string
}

export interface TranslatedChat extends BaseChat {
  translate: string
  with: MinecraftChat[]
}

export interface KeybindChat extends BaseChat {
  keybind: string
}

export type MinecraftChat = PlainTextChat | TranslatedChat | string

export interface ClickEvent {
  action:
    | 'open_url'
    | 'open_file'
    | 'run_command'
    | 'suggest_command'
    | 'change_page'
    | 'copy_to_clipboard'
  value: string
}

// LOW-TODO: How can we display this in EnderChat?
export interface HoverEvent {
  action: 'show_text' | 'show_item' | 'show_entity' | 'show_achievement' // <1.12
  value: MinecraftChat
}

const hasColorCodes = (s: string): boolean => /§[0-9a-fk-orx]/.test(s)
// const stripColorCodes = (s: string) => s.replace(/§[0-9a-fk-orx]/g, '').trim()
const parseColorCodes = (arg: string | PlainTextChat): PlainTextChat[] => {
  let s: string
  let state: PlainTextChat & { text: string } = { text: '' }
  if (typeof arg !== 'string') {
    state = { ...arg, text: '' }
    s = ''
  } else s = arg
  const components: PlainTextChat[] = []
  for (let i = 0; i < s.length; i++) {
    const char = s[i]
    if (char === '§') {
      if (i + 1 === s.length) continue
      const info = s[i + 1]
      if (i > 0) {
        // Move the state into array.
        components.push(Object.assign({}, state))
      }
      // Clear text in state.
      state.text = ''
      // Apply new properties to state.
      if (info === 'k') state.obfuscated = true
      else if (info === 'l') state.bold = true
      else if (info === 'm') state.strikethrough = true
      else if (info === 'n') state.underlined = true
      else if (info === 'o') state.italic = true
      else if (info === 'r') state = { text: '' }
      else if (info === '0') state = { text: '', color: 'black' }
      else if (info === '1') state = { text: '', color: 'dark_blue' }
      else if (info === '2') state = { text: '', color: 'dark_green' }
      else if (info === '3') state = { text: '', color: 'dark_aqua' }
      else if (info === '4') state = { text: '', color: 'dark_red' }
      else if (info === '5') state = { text: '', color: 'dark_purple' }
      else if (info === '6') state = { text: '', color: 'gold' }
      else if (info === '7') state = { text: '', color: 'gray' }
      else if (info === '8') state = { text: '', color: 'dark_gray' }
      else if (info === '9') state = { text: '', color: 'blue' }
      else if (info === 'a') state = { text: '', color: 'green' }
      else if (info === 'b') state = { text: '', color: 'aqua' }
      else if (info === 'c') state = { text: '', color: 'red' }
      else if (info === 'd') state = { text: '', color: 'light_purple' }
      else if (info === 'e') state = { text: '', color: 'yellow' }
      else if (info === 'f') state = { text: '', color: 'white' }
    } else if (i > 0 && s[i - 1] === '§') continue
    else state.text += char
  }
  components.push(state)
  return components
}

const trimComponentsByLine = (chat: PlainTextChat[]): PlainTextChat[] => {
  if (chat.length < 1) return chat
  const trimmed = []
  // Trim lines.
  let trimNextComponent = true
  for (const component of chat) {
    if (component.text) {
      if (trimNextComponent) {
        trimNextComponent = false
        component.text = component.text.trimStart()
      }
      const lines = component.text.split('\n')
      if (lines.length > 1) {
        const newComponent = { ...component }
        // Trim the end of the current line, trim the start of the next line.
        for (let line = 0; line < lines.length - 1; line++) {
          lines[line] = lines[line].trimEnd()
          if (line + 1 < lines.length) {
            lines[line + 1] = lines[line + 1].trimStart()
          }
        }
        // If the last line is empty, mark the next component for trimming.
        if (lines[lines.length - 1].length === 0) trimNextComponent = true
        // If the first line is empty, go back and trim the previous component.
        if (lines[0].length === 0 && trimmed.length > 0) {
          const previousComponent = trimmed[trimmed.length - 1]
          if (previousComponent.text) {
            previousComponent.text = previousComponent.text.trimEnd()
          }
        }
        newComponent.text = lines.join('\n')
        trimmed.push(newComponent)
      } else {
        trimmed.push(component)
      }
    }
  }
  // Trim last component.
  const lastComponent = trimmed[trimmed.length - 1]
  if (lastComponent.text) {
    lastComponent.text = lastComponent.text.trimEnd()
  }
  return trimmed
}

const isTranslatedChat = (chat: MinecraftChat): chat is TranslatedChat =>
  typeof (chat as TranslatedChat).translate === 'string' ||
  (chat as TranslatedChat).type === 'translatable'

const translateChat = (chat: TranslatedChat): PlainTextChat => {
  const { translate, with: tw, ...c } = chat
  const translation = translations[translate].split('%s').flatMap((text, index) => {
    let insert = tw[index]
    if (!insert) return { text }
    else if (typeof insert === 'string') insert = { text: insert }
    else if (isTranslatedChat(insert)) insert = translateChat(insert)
    return [{ text }, insert]
  })
  if (!translation) {
    return { text: `[EnderChat] Unknown translation ${translate}.` }
  }
  return {
    ...c,
    extra: Array.isArray(c.extra) ? [...translation, ...c.extra] : translation,
  }
}

const isKeybindChat = (chat: MinecraftChat): chat is KeybindChat =>
  typeof (chat as KeybindChat).keybind === 'string' || (chat as KeybindChat).type === 'keybind'

const keybindChat = (chat: KeybindChat): PlainTextChat => {
  const { keybind, ...c } = chat
  return { ...c, text: keybind }
}

const flattenComponents = (chat: MinecraftChat): PlainTextChat[] => {
  if (typeof chat === 'string') return parseColorCodes(chat)
  // Fix components with empty string keys.....
  const looseChat = chat as MinecraftChat & Record<string, unknown>
  if (looseChat['']) {
    const key = isTranslatedChat(chat) ? 'translate' : isKeybindChat(chat) ? 'keybind' : 'text'
    looseChat[key] = looseChat['']
  }
  if (isKeybindChat(chat)) chat = keybindChat(chat)
  else if (isTranslatedChat(chat)) chat = translateChat(chat)
  const { extra, ...c } = chat
  const arr =
    c.text && hasColorCodes(c.text)
      ? parseColorCodes(c.text).map(e => ({ ...c, ...e }))
      : c.text
        ? [c]
        : []
  if (!extra) return arr
  const flattenedExtra = extra.flatMap(e => {
    if (typeof e === 'string') e = { text: e } // Colour codes will be parsed in the next step.
    return flattenComponents({ ...c, ...e })
  })
  return [...arr, ...flattenedExtra]
}

// Some stupid implementations do stupid things, like returning booleans as strings.
const sanitizeComponents = (components: PlainTextChat[]): PlainTextChat[] =>
  components.map(c => ({
    ...c,
    bold: typeof c.bold === 'string' ? c.bold === 'true' : c.bold,
    italic: typeof c.italic === 'string' ? c.italic === 'true' : c.italic,
    obfuscated: typeof c.obfuscated === 'string' ? c.obfuscated === 'true' : c.obfuscated,
    underlined: typeof c.underlined === 'string' ? c.underlined === 'true' : c.underlined,
    strikethrough:
      typeof c.strikethrough === 'string' ? c.strikethrough === 'true' : c.strikethrough,
  }))

const parseChatToJsx = (
  chat: MinecraftChat,
  Component: React.ComponentType<TextProps>,
  colorMap: ColorMap,
  handleClickEvent?: (clickEvent: ClickEvent) => void,
  componentProps?: Record<string, unknown>,
  trim = false,
): React.JSX.Element => {
  let flat = sanitizeComponents(flattenComponents(chat))
  if (trim) flat = trimComponentsByLine(flat)
  return (
    <Component {...componentProps}>
      {flat.map((c, i) => {
        const style: StyleProp<TextStyle> = {}
        if (c.bold) style.fontWeight = 'bold'
        if (c.italic) style.fontStyle = 'italic'
        if (c.obfuscated) c.text = (c.text ?? '').replace(/./g, '▒')
        if (c.underlined && c.strikethrough) {
          style.textDecorationLine = 'underline line-through'
        } else if (c.underlined) style.textDecorationLine = 'underline'
        else if (c.strikethrough) style.textDecorationLine = 'line-through'

        if (c.color?.startsWith('#')) style.color = c.color
        else if (c.color && colorMap[c.color]) style.color = colorMap[c.color]

        const ce = c.clickEvent
        return (
          <Component
            key={i}
            style={style}
            selectable
            onPress={ce && handleClickEvent ? () => handleClickEvent(ce) : undefined}
            onLongPress={() => {
              /* no-op */
            }}
          >
            {c.text ? c.text : ''}
          </Component>
        )
      })}
    </Component>
  )
}

// React Component-ised. Memoise if being called often.
export const ChatToJsx = (props: {
  chat?: MinecraftChat
  component: React.ComponentType<TextProps>
  colorMap: ColorMap
  componentProps?: Record<string, unknown>
  onClickEvent?: (clickEvent: ClickEvent) => void
  trim?: boolean
}): React.JSX.Element =>
  parseChatToJsx(
    props.chat ?? { text: '' },
    props.component,
    props.colorMap,
    props.onClickEvent,
    props.componentProps,
    props.trim,
  )

export default parseChatToJsx
