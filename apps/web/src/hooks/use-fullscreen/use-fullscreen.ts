import { useCallback, useEffect, useRef, useState } from "react"

const getFullscreenElement = (): Element | null => {
  const _document = window.document as Document & {
    webkitFullscreenElement?: HTMLElement
    mozFullScreenElement?: HTMLElement
    msFullscreenElement?: HTMLElement
  }

  return (
    _document.fullscreenElement ||
    _document.webkitFullscreenElement ||
    _document.mozFullScreenElement ||
    _document.msFullscreenElement ||
    null
  )
}

const exitFullscreen = (): Promise<void> | null => {
  const _document = window.document as Document & {
    webkitExitFullscreen?: () => Promise<void>
    msExitFullscreen?: () => Promise<void>
    mozCancelFullScreen?: () => Promise<void>
  }

  if (typeof _document.exitFullscreen === "function") {
    return _document.exitFullscreen()
  }
  if (typeof _document.msExitFullscreen === "function") {
    return _document.msExitFullscreen()
  }
  if (typeof _document.webkitExitFullscreen === "function") {
    return _document.webkitExitFullscreen()
  }
  if (typeof _document.mozCancelFullScreen === "function") {
    return _document.mozCancelFullScreen()
  }

  return null
}

const enterFullScreen = (element: HTMLElement): Promise<void> | null => {
  const _element = element as HTMLElement & {
    webkitEnterFullscreen?: () => Promise<void>
    webkitRequestFullscreen?: () => Promise<void>
    msRequestFullscreen?: () => Promise<void>
    mozRequestFullscreen?: () => Promise<void>
  }

  return (
    _element.requestFullscreen?.() ||
    _element.msRequestFullscreen?.() ||
    _element.webkitEnterFullscreen?.() ||
    _element.webkitRequestFullscreen?.() ||
    _element.mozRequestFullscreen?.() ||
    null
  )
}

const prefixes = ["", "webkit", "moz", "ms"]

/**
 * Adds fullscreen and error event listeners to an element
 * @param element The element to add event listeners to
 * @param handlers The event handlers for fullscreen and error events
 * @returns A function to remove the event listeners
 */
const addEvents = (
  element: HTMLElement,
  handlers: { onFullScreen: (event: Event) => void; onError: (event: Event) => void }
): (() => void) => {
  const { onFullScreen, onError } = handlers

  prefixes.forEach((prefix) => {
    element.addEventListener(`${prefix}fullscreenchange`, onFullScreen)
    element.addEventListener(`${prefix}fullscreenerror`, onError)
  })

  return () => {
    prefixes.forEach((prefix) => {
      element.removeEventListener(`${prefix}fullscreenchange`, onFullScreen)
      element.removeEventListener(`${prefix}fullscreenerror`, onError)
    })
  }
}

/**
 * Custom hook to manage fullscreen mode
 * @returns An object containing the ref, toggle function, and fullscreen state
 */
export const useFullscreen = <T extends HTMLElement = HTMLElement>() => {
  const [fullscreen, setFullscreen] = useState<boolean>(false)
  const _ref = useRef<T>(null)

  const handleFullscreenChange = useCallback(
    (event: Event) => {
      setFullscreen(event.target === getFullscreenElement())
    },
    [setFullscreen]
  )

  const handleFullscreenError = useCallback(
    (event: Event) => {
      setFullscreen(false)
      console.error(`[hooks] use-fullscreen: Error attempting full-screen mode method: ${event} (${event.target})`)
    },
    [setFullscreen]
  )

  const toggle = useCallback(async () => {
    if (!getFullscreenElement()) {
      await enterFullScreen(_ref.current!)
    } else {
      await exitFullscreen()
    }
  }, [])

  const ref = useCallback((element: T | null) => {
    _ref.current = element ?? (window.document.documentElement as T)
  }, [])

  useEffect(() => {
    if (!_ref.current && window.document) {
      _ref.current = window.document.documentElement as T
      return addEvents(_ref.current, {
        onFullScreen: handleFullscreenChange,
        onError: handleFullscreenError,
      })
    }

    if (_ref.current) {
      return addEvents(_ref.current, {
        onFullScreen: handleFullscreenChange,
        onError: handleFullscreenError,
      })
    }

    return undefined
  }, [])

  return { ref, toggle, fullscreen } as const
}
