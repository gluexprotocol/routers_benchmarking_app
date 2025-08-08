import { useEffect } from "react"

/**
 * Custom hook to add and remove window event listeners
 *
 * @param type - The event type to listen for
 * @param listener - The event listener callback
 * @param options - Optional options for the event listener
 */
export const useWindowEvent = <K extends keyof WindowEventMap | string>(
  type: K,
  listener: K extends keyof WindowEventMap
    ? (this: Window, ev: WindowEventMap[K]) => void
    : (this: Window, ev: CustomEvent) => void,
  options?: boolean | AddEventListenerOptions
): void => {
  useEffect(() => {
    window.addEventListener(type, listener as EventListener, options)
    return () => window.removeEventListener(type, listener as EventListener, options)
  }, [type, listener, options])
}
