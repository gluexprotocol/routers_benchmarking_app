import { useEffect } from "react"

import { getHotkeyHandler, getHotkeyMatcher, HotkeyItemOptions } from "./parse-hotkey"

export type { HotkeyItemOptions }
export { getHotkeyHandler }

export type HotkeyItem = [string, (event: KeyboardEvent) => void, HotkeyItemOptions?]

/**
 * Determines if the event should fire based on the target element
 *
 * @param {KeyboardEvent} event - The keyboard event
 * @param {string[]} tagsToIgnore - List of tags to ignore
 * @param {boolean} triggerOnContentEditable - Whether to trigger on content editable elements
 * @returns {boolean} - Whether the event should fire
 */
const shouldFireEvent = (event: KeyboardEvent, tagsToIgnore: string[], triggerOnContentEditable = false): boolean => {
  if (event.target instanceof HTMLElement) {
    if (triggerOnContentEditable) {
      return !tagsToIgnore.includes(event.target.tagName)
    }

    return !event.target.isContentEditable && !tagsToIgnore.includes(event.target.tagName)
  }

  return true
}

/**
 * Custom hook to handle hotkeys
 *
 * @param {HotkeyItem[]} hotkeys - List of hotkeys and their handlers
 * @param {string[]} tagsToIgnore - List of tags to ignore
 * @param {boolean} triggerOnContentEditable - Whether to trigger on content editable elements
 */
export const useHotkeys = (
  hotkeys: HotkeyItem[],
  tagsToIgnore: string[] = ["INPUT", "TEXTAREA", "SELECT"],
  triggerOnContentEditable = false
): void => {
  useEffect(() => {
    const keydownListener = (event: KeyboardEvent) => {
      hotkeys.forEach(([hotkey, handler, options = { preventDefault: true }]) => {
        if (getHotkeyMatcher(hotkey)(event) && shouldFireEvent(event, tagsToIgnore, triggerOnContentEditable)) {
          if (options.preventDefault) {
            event.preventDefault()
          }

          handler(event)
        }
      })
    }

    document.documentElement.addEventListener("keydown", keydownListener)
    return () => document.documentElement.removeEventListener("keydown", keydownListener)
  }, [hotkeys])
}
