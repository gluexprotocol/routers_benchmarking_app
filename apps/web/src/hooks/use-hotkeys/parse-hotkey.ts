export interface KeyboardModifiers {
  alt: boolean
  ctrl: boolean
  meta: boolean
  mod: boolean
  shift: boolean
  plus: boolean
}

export type Hotkey = KeyboardModifiers & {
  key?: string
}

type CheckHotkeyMatch = (event: KeyboardEvent) => boolean

/**
 * Parses a hotkey string into a Hotkey object
 * @param {string} hotkey - The hotkey string to parse
 * @returns {Hotkey} The parsed Hotkey object
 */
export const parseHotkey = (hotkey: string): Hotkey => {
  const keys = hotkey
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())

  const modifiers: KeyboardModifiers = {
    alt: keys.includes("alt"),
    ctrl: keys.includes("ctrl"),
    meta: keys.includes("meta"),
    mod: keys.includes("mod"),
    shift: keys.includes("shift"),
    plus: keys.includes("[plus]"),
  }

  const reservedKeys = ["alt", "ctrl", "meta", "shift", "mod"]

  const freeKey = keys.find((key) => !reservedKeys.includes(key))

  return {
    ...modifiers,
    key: freeKey === "[plus]" ? "+" : freeKey,
  }
}

/**
 * Checks if a hotkey matches a keyboard event
 * @param {Hotkey} hotkey - The hotkey to check
 * @param {KeyboardEvent} event - The keyboard event to match against
 * @returns {boolean} True if the hotkey matches the event, false otherwise
 */
const isExactHotkey = (hotkey: Hotkey, event: KeyboardEvent): boolean => {
  const { alt, ctrl, meta, mod, shift, key } = hotkey
  const { altKey, ctrlKey, metaKey, shiftKey, key: pressedKey } = event

  if (alt !== altKey) {
    return false
  }

  if (mod) {
    if (!ctrlKey && !metaKey) {
      return false
    }
  } else {
    if (ctrl !== ctrlKey) {
      return false
    }
    if (meta !== metaKey) {
      return false
    }
  }
  if (shift !== shiftKey) {
    return false
  }

  if (
    key &&
    (pressedKey.toLowerCase() === key.toLowerCase() ||
      event.code.replace("Key", "").toLowerCase() === key.toLowerCase())
  ) {
    return true
  }

  return false
}

/**
 * Returns a function that checks if a keyboard event matches a hotkey
 * @param {string} hotkey - The hotkey string to match
 * @returns {CheckHotkeyMatch} The function that checks the hotkey match
 */
export const getHotkeyMatcher =
  (hotkey: string): CheckHotkeyMatch =>
  (event) =>
    isExactHotkey(parseHotkey(hotkey), event)

export interface HotkeyItemOptions {
  preventDefault?: boolean
}

type HotkeyItem = [string, (event: unknown) => void, HotkeyItemOptions?]

/**
 * Returns a function that handles hotkey events
 * @param {HotkeyItem[]} hotkeys - The list of hotkeys and their handlers
 * @returns {(event: React.KeyboardEvent<HTMLElement> | KeyboardEvent) => void} The hotkey handler function
 */
export const getHotkeyHandler =
  (hotkeys: HotkeyItem[]) => (event: React.KeyboardEvent<HTMLElement> | KeyboardEvent) => {
    const _event = "nativeEvent" in event ? event.nativeEvent : event
    hotkeys.forEach(([hotkey, handler, options = { preventDefault: true }]) => {
      if (getHotkeyMatcher(hotkey)(_event)) {
        if (options.preventDefault) {
          event.preventDefault()
        }

        handler(_event)
      }
    })
  }
