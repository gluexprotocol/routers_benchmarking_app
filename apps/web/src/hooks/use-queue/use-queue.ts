import { useState } from "react"

/**
 * Custom hook to manage a queue with a limit on the number of items in the state
 * @template T
 * @param {Object} params - Parameters for the hook
 * @param {T[]} [params.initialValues=[]] - Initial values for the queue
 * @param {number} params.limit - Maximum number of items in the state
 * @returns {Object} The state, queue, and functions to manipulate them
 */
export const useQueue = <T>({ initialValues = [], limit }: { initialValues?: T[]; limit: number }) => {
  const [state, setState] = useState({
    state: initialValues.slice(0, limit),
    queue: initialValues.slice(limit),
  })

  /**
   * Adds items to the queue
   * @param {...T} items - Items to add to the queue
   */
  const add = (...items: T[]) =>
    setState((current) => {
      const results = [...current.state, ...current.queue, ...items]

      return {
        state: results.slice(0, limit),
        queue: results.slice(limit),
      }
    })

  /**
   * Updates the state and queue using a provided function
   * @param {function(T[]): T[]} fn - Function to update the state and queue
   */
  const update = (fn: (state: T[]) => T[]) =>
    setState((current) => {
      const results = fn([...current.state, ...current.queue])

      return {
        state: results.slice(0, limit),
        queue: results.slice(limit),
      }
    })

  /**
   * Clears the queue
   */
  const cleanQueue = () => setState((current) => ({ state: current.state, queue: [] }))

  return {
    state: state.state,
    queue: state.queue,
    add,
    update,
    cleanQueue,
  }
}
