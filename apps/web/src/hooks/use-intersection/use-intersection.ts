import { useCallback, useRef, useState } from "react"

/**
 * Custom hook to observe intersection changes of an element
 * @param {IntersectionObserverInit} [options] - Intersection observer options
 * @returns {{ ref: (element: T | null) => void, entry: IntersectionObserverEntry | null }}
 */
export const useIntersection = <T extends HTMLElement>(options?: IntersectionObserverInit) => {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)

  const observer = useRef<IntersectionObserver | null>(null)

  const ref = useCallback(
    (element: T | null) => {
      if (observer.current) {
        observer.current.disconnect()
        observer.current = null
      }

      if (element === null) {
        setEntry(null)
        return
      }

      observer.current = new IntersectionObserver(([_entry]) => {
        if (_entry) {
          setEntry(_entry)
        }
      }, options)

      observer.current.observe(element)
    },
    [options?.rootMargin, options?.root, options?.threshold]
  )

  return { ref, entry }
}
