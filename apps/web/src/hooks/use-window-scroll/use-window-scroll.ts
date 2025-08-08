import { useEffect, useState } from "react"

import { useWindowEvent } from "../use-window-event/use-window-event"

interface ScrollPosition {
  x: number
  y: number
}

const getScrollPosition = (): ScrollPosition =>
  typeof window !== "undefined" ? { x: window.pageXOffset, y: window.pageYOffset } : { x: 0, y: 0 }

/**
 * Scrolls the window to the specified position
 * @param {Partial<ScrollPosition>} param0 - The scroll position
 */
const scrollTo = ({ x, y }: Partial<ScrollPosition>): void => {
  if (typeof window !== "undefined") {
    const scrollOptions: ScrollToOptions = { behavior: "smooth" }

    if (typeof x === "number") {
      scrollOptions.left = x
    }

    if (typeof y === "number") {
      scrollOptions.top = y
    }

    window.scrollTo(scrollOptions)
  }
}

/**
 * Custom hook to get the window scroll position
 * @returns {[ScrollPosition, (position: Partial<ScrollPosition>) => void]} - The scroll position and scrollTo function
 */
export const useWindowScroll = (): readonly [ScrollPosition, (position: Partial<ScrollPosition>) => void] => {
  const [position, setPosition] = useState<ScrollPosition>({ x: 0, y: 0 })

  useWindowEvent("scroll", () => setPosition(getScrollPosition()))
  useWindowEvent("resize", () => setPosition(getScrollPosition()))

  useEffect(() => {
    setPosition(getScrollPosition())
  }, [])

  return [position, scrollTo] as const
}
