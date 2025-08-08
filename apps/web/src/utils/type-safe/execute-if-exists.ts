const executeIfExists = <T extends (...args: A) => R, A extends unknown[], R>(
  func: T | undefined | null,
  ...args: A
): R | undefined => {
  if (func) {
    return func(...args)
  }
  return undefined
}

export default executeIfExists
