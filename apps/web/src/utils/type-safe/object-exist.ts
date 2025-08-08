/**
 * Checks if a variable is not undefined, not null, and if:
 * - It's an object, it has at least one non-nullable property.
 * - It's an array, it has a length greater than 0.
 * - It's a primitive, it is defined and not null.
 *
 * @param value The variable to check.
 * @returns `true` if the variable satisfies the conditions, otherwise `false`.
 */
const objectExists = <T>(value: T): boolean => {
  if (value === null || value === undefined) {
    return false
  }

  if (Array.isArray(value)) {
    return value.length > 0
  }

  if (typeof value === "object") {
    return Object.values(value).some((prop) => prop !== null && prop !== undefined)
  }

  return true
}

export default objectExists
