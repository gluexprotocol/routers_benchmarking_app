import { useCallback, useEffect, useRef } from "react"

/**
 * Custom hook to manage a timeout
 * @param callback - Function to be called after the timeout
 * @param delay - Delay in milliseconds for the timeout
 * @param options - Options for the timeout
 * @returns Object containing start and clear functions
 */
export const useTimeout = <T extends unknown[]>(
  callback: (...callbackParams: T) => void,
  delay: number,
  options: { autoInvoke: boolean } = { autoInvoke: false }
) => {
  const timeoutRef = useRef<number | null>(null)

  const start = useCallback(
    (...callbackParams: T) => {
      if (!timeoutRef.current) {
        timeoutRef.current = window.setTimeout(() => {
          callback(callbackParams)
          timeoutRef.current = null
        }, delay)
      }
    },
    [delay, callback]
  )

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (options.autoInvoke) {
      start()
    }

    return clear
  }, [clear, start, options.autoInvoke])

  return { start, clear }
}
