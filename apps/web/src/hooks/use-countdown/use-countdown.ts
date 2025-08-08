import { useCallback, useState } from "react"

import { useCounter } from "../use-counter/use-counter"
import { useInterval } from "../use-interval/use-interval"

interface CountdownOptions {
  countStart: number
  intervalMs?: number
  isIncrement?: boolean
  countStop?: number
}

interface CountdownControllers {
  startCountdown: () => void
  stopCountdown: () => void
  resetCountdown: () => void
  resetAndStartCountdown: () => void
}

/**
 * Manages countdown
 * @param {CountdownOptions} countdownOptions - The countdown's options
 * @returns {[number, CountdownControllers]} An array containing the countdown's count and its controllers
 * @example
 * ```tsx
 * const [counter, { start, stop, reset }] = useCountdown({
 *   countStart: 10,
 *   intervalMs: 1000,
 *   isIncrement: false,
 * });
 * ```
 */
export const useCountdown = ({
  countStart,
  countStop = 0,
  intervalMs = 1000,
  isIncrement = false,
}: CountdownOptions): [number, CountdownControllers] => {
  const [count, { increment, decrement, reset: resetCounter }] = useCounter(countStart)
  const [isCountdownRunning, setIsCountdownRunning] = useState(true)

  const resetCountdown = useCallback(() => {
    setIsCountdownRunning(false)
    resetCounter()
  }, [resetCounter])

  const countdownCallback = useCallback(() => {
    if (count === countStop) {
      setIsCountdownRunning(false)
      return
    }

    if (isIncrement) {
      increment()
    } else {
      decrement()
    }
  }, [count, countStop, decrement, increment, isIncrement])

  useInterval(countdownCallback, (isCountdownRunning ? intervalMs : null) ?? 0)

  return [
    count,
    {
      startCountdown: () => setIsCountdownRunning(true),
      stopCountdown: () => setIsCountdownRunning(false),
      resetCountdown,
      resetAndStartCountdown: () => {
        resetCountdown()
        setIsCountdownRunning(true)
      },
    },
  ]
}
