import { useCallback, useState } from "react"

/**
 * Custom hook to manage disclosure state
 * @param {boolean} initialState - Initial state of the disclosure
 * @param {Object} callbacks - Optional callbacks for open and close events
 * @param {() => void} [callbacks.onOpen] - Callback when opened
 * @param {() => void} [callbacks.onClose] - Callback when closed
 * @returns {[boolean, { open: () => void, close: () => void, toggle: () => void }]} Disclosure state and controls
 */
export const useDisclosure = (
  initialState: boolean = false,
  callbacks?: { onOpen?: () => void; onClose?: () => void }
) => {
  const { onOpen, onClose } = callbacks || {}
  const [opened, setOpened] = useState<boolean>(initialState)

  const open = useCallback(() => {
    setOpened((isOpened) => {
      if (!isOpened) {
        onOpen?.()
        return true
      }
      return isOpened
    })
  }, [onOpen])

  const close = useCallback(() => {
    setOpened((isOpened) => {
      if (isOpened) {
        onClose?.()
        return false
      }
      return isOpened
    })
  }, [onClose])

  const toggle = useCallback(() => {
    if (opened) {
      close()
    } else {
      open()
    }
  }, [close, open, opened])

  return [opened, { open, close, toggle }] as const
}
