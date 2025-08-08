import { useCallback, useRef, useState } from "react"

/**
 * Custom hook to check if an element is in the viewport
 * @returns {object} - Object containing ref callback and inViewport state
 */
export const useInViewport = <T extends HTMLElement>() => {
  const observer = useRef<IntersectionObserver | null>(null)
  const [inViewport, setInViewport] = useState(false)

  const ref = useCallback((node: T | null) => {
    if (typeof IntersectionObserver !== "undefined") {
      if (node && !observer.current) {
        observer.current = new IntersectionObserver(([entry]) => entry && setInViewport(entry.isIntersecting))
      } else {
        observer.current?.disconnect()
      }

      if (node) {
        observer.current?.observe(node)
      } else {
        setInViewport(false)
      }
    }
  }, [])

  return { ref, inViewport }
}
