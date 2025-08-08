import { useState } from "react"

import { clamp } from "~/utils"

const DEFAULT_OPTIONS = {
  min: -Infinity,
  max: Infinity,
}

interface Options {
  min: number
  max: number
}

/**
 * Custom hook to manage a counter with optional min and max constraints
 *
 * @param {number} initialValue - The initial value of the counter
 * @param {Partial<Options>} [options] - Optional min and max constraints
 * @returns {[number, { increment: () => void, decrement: () => void, set: (value: number) => void, reset: () => void }]} The current count and an object with methods to modify the count
 */
export const useCounter = (initialValue: number = 0, options?: Partial<Options>) => {
  const { min, max } = { ...DEFAULT_OPTIONS, ...options }
  const [count, setCount] = useState<number>(clamp(initialValue, min, max))

  const increment = (): void => setCount((current) => clamp(current + 1, min, max))
  const decrement = (): void => setCount((current) => clamp(current - 1, min, max))
  const set = (value: number): void => setCount(clamp(value, min, max))
  const reset = (): void => setCount(clamp(initialValue, min, max))

  return [count, { increment, decrement, set, reset }] as const
}
