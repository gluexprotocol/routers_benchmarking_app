import { useCallback, useEffect, useMemo, useRef } from "react"

const noop = () => {}

/**
 * Custom hook to create a callback ref
 * @param callback - The callback function
 * @returns The callback ref
 */
export const useCallbackRef = <T extends (...args: unknown[]) => unknown>(callback: T | undefined): T => {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return useMemo(() => ((...args: unknown[]) => callbackRef.current?.(...args)) as T, [])
}

/**
 * Custom hook to create a debounced callback
 * @param callback - The callback function to debounce
 * @param options - The debounce delay or an options object
 * @returns The debounced callback with a flush method
 */
export const useDebouncedCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  options: number | { delay: number; flushOnUnmount?: boolean }
) => {
  const delay = typeof options === "number" ? options : options.delay
  const flushOnUnmount = typeof options === "number" ? false : options.flushOnUnmount
  const handleCallback = useCallbackRef(callback)
  const debounceTimerRef = useRef<number>(0)

  const lastCallback = Object.assign(
    useCallback(
      (...args: Parameters<T>) => {
        window.clearTimeout(debounceTimerRef.current)
        const flush = () => {
          if (debounceTimerRef.current !== 0) {
            debounceTimerRef.current = 0
            handleCallback(...args)
          }
        }
        lastCallback.flush = flush
        debounceTimerRef.current = window.setTimeout(flush, delay)
      },
      [handleCallback, delay]
    ),
    { flush: noop }
  )

  useEffect(
    () => () => {
      window.clearTimeout(debounceTimerRef.current)
      if (flushOnUnmount) {
        lastCallback.flush()
      }
    },
    [lastCallback, flushOnUnmount]
  )

  return lastCallback
}
