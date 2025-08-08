import { useCallback, useEffect, useState } from "react"

import { useWindowEvent } from "../use-window-event/use-window-event"

const eventListerOptions = {
  passive: true,
}

/**
 * Custom hook to get the current viewport size
 * @returns {Object} The current width and height of the viewport
 */
export const useViewportSize = (): { width: number; height: number } => {
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })

  const setSize = useCallback(() => {
    setWindowSize({ width: window.innerWidth || 0, height: window.innerHeight || 0 })
  }, [])

  useWindowEvent("resize", setSize, eventListerOptions)
  useWindowEvent("orientationchange", setSize, eventListerOptions)
  useEffect(setSize, [])

  return windowSize
}
