import { useResizeObserver } from "./use-resize-observer"

/**
 * Custom hook to get the size of an HTML element
 * @param {ResizeObserverOptions} [options] - Options for the ResizeObserver
 * @returns {{ ref: React.RefObject<T>, width: number, height: number }} - Ref to the observed element and its width and height
 */
export const useElementSize = <T extends HTMLElement>(options?: ResizeObserverOptions) => {
  const [ref, { width, height }] = useResizeObserver<T>(options)
  return { ref, width, height }
}
