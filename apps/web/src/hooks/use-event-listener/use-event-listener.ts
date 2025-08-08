import { useEffect, useRef } from "react"

/**
 * Custom hook to add an event listener to an HTML element
 * @param type - The event type to listen for
 * @param listener - The event listener callback
 * @param options - Optional options for addEventListener
 * @returns A ref to the HTML element
 */
export const useEventListener = <K extends keyof HTMLElementEventMap, T extends HTMLElement>(
  type: K,
  listener: (this: T, ev: HTMLElementEventMap[K]) => unknown,
  options?: boolean | AddEventListenerOptions
) => {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (element) {
      element.addEventListener(type, listener as unknown as EventListener, options)
      return () => element.removeEventListener(type, listener as unknown as EventListener, options)
    }
    return undefined
  }, [listener, options])

  return ref
}
