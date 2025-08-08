import { useReducer } from "react"

/**
 * Custom hook to toggle between options
 * @param {readonly T[]} options - Array of options to toggle between
 * @returns {[T, (value?: React.SetStateAction<T>) => void]} - Current option and toggle function
 */
export const useToggle = <T = boolean>(options: readonly T[] = []) => {
  const [[option], toggle] = useReducer((state: T[], action: React.SetStateAction<T>) => {
    const value = action instanceof Function ? (state[0] ? action(state[0]) : null) : action
    if (value) {
      const index = Math.abs(state.indexOf(value))
      return state.slice(index).concat(state.slice(0, index))
    }
    return state
  }, options as T[])

  return [option, toggle as (value?: React.SetStateAction<T>) => void] as const
}
