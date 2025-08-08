import { useEffect, useRef, useState } from "react"

interface UseIntervalOptions {
  /** If set, the interval will start automatically when the component is mounted, `false` by default */
  autoInvoke?: boolean
}

/**
 * Custom hook to manage intervals
 * @param fn Function to be called at each interval
 * @param interval Time interval in milliseconds
 * @param options Options for the interval hook
 * @returns Object with start, stop, toggle functions and active state
 */
export const useInterval = (fn: () => void, interval: number, { autoInvoke = false }: UseIntervalOptions = {}) => {
  const [active, setActive] = useState<boolean>(false)
  const intervalRef = useRef<number | null>(null)
  const fnRef = useRef<() => void | null>(null)

  const start = (): void => {
    setActive((old) => {
      if (!old && (!intervalRef.current || intervalRef.current === -1)) {
        intervalRef.current = window.setInterval(fnRef.current!, interval)
      }
      return true
    })
  }

  const stop = (): void => {
    setActive(false)
    window.clearInterval(intervalRef.current || -1)
    intervalRef.current = -1
  }

  const toggle = (): void => {
    if (active) {
      stop()
    } else {
      start()
    }
  }

  useEffect(() => {
    fnRef.current = fn
    if (active) {
      start()
    }
    return stop
  }, [fn, active, interval])

  useEffect(() => {
    if (autoInvoke) {
      start()
    }
  }, [])

  return { start, stop, toggle, active }
}
