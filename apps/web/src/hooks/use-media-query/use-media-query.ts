"use client"

import { useEffect, useRef, useState } from "react"

export interface UseMediaQueryOptions {
  getInitialValueInEffect: boolean
}

type MediaQueryCallback = (event: { matches: boolean; media: string }) => void

/**
 * Older versions of Safari (shipped with Catalina and before) do not support addEventListener on matchMedia
 * https://stackoverflow.com/questions/56466261/matchmedia-addlistener-marked-as-deprecated-addeventlistener-equivalent
 */
const attachMediaListener = (query: MediaQueryList, callback: MediaQueryCallback): (() => void) => {
  try {
    query.addEventListener("change", callback)
    return () => query.removeEventListener("change", callback)
  } catch {
    query.addListener(callback)
    return () => query.removeListener(callback)
  }
}

const getInitialValue = (query: string, initialValue?: boolean): boolean => {
  if (typeof initialValue === "boolean") {
    return initialValue
  }

  if (typeof window !== "undefined" && "matchMedia" in window) {
    return window.matchMedia(query).matches
  }

  return false
}

/**
 * Custom hook to determine if a media query matches
 * @param query - The media query string
 * @param initialValue - The initial value to use
 * @param options - Options for the hook
 * @returns Whether the media query matches
 */
export const useMediaQuery = (
  query: string,
  initialValue?: boolean,
  { getInitialValueInEffect }: UseMediaQueryOptions = {
    getInitialValueInEffect: true,
  }
): boolean => {
  const [matches, setMatches] = useState<boolean>(
    (getInitialValueInEffect ? initialValue : getInitialValue(query)) ?? false
  )
  const queryRef = useRef<MediaQueryList>(null)

  useEffect(() => {
    if ("matchMedia" in window) {
      queryRef.current = window.matchMedia(query)
      setMatches(queryRef.current.matches)
      return attachMediaListener(queryRef.current, (event) => setMatches(event.matches))
    }

    return undefined
  }, [query])

  return matches
}
