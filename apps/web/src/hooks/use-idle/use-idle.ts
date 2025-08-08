import { useEffect, useRef, useState } from "react"

const DEFAULT_EVENTS: (keyof DocumentEventMap)[] = ["keypress", "mousemove", "touchmove", "click", "scroll"]
const DEFAULT_OPTIONS = {
  events: DEFAULT_EVENTS,
  initialState: true,
}

/**
 * Custom hook to detect user idle state
 * @param {number} timeout - Time in milliseconds to wait before setting idle state
 * @param {Partial<{ events: (keyof DocumentEventMap)[]; initialState: boolean }>} [options] - Optional configuration for events and initial state
 * @returns {boolean} - Idle state
 */
export const useIdle = (
  timeout: number,
  options?: Partial<{ events: (keyof DocumentEventMap)[]; initialState: boolean }>
): boolean => {
  const { events, initialState } = { ...DEFAULT_OPTIONS, ...options }
  const [idle, setIdle] = useState<boolean>(initialState)
  const timer = useRef<number>(-1)

  useEffect(() => {
    const handleEvents = (): void => {
      setIdle(false)

      if (timer.current) {
        window.clearTimeout(timer.current)
      }

      timer.current = window.setTimeout(() => {
        setIdle(true)
      }, timeout)
    }

    events.forEach((event) => document.addEventListener(event, handleEvents))

    // Start the timer immediately instead of waiting for the first event to happen
    timer.current = window.setTimeout(() => {
      setIdle(true)
    }, timeout)

    return () => {
      events.forEach((event) => document.removeEventListener(event, handleEvents))
    }
  }, [timeout])

  return idle
}
