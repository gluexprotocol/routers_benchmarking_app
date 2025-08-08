/**
 * Clamps a number between a minimum and maximum value
 *
 * @param {number} value - The number to clamp
 * @param {number | undefined} min - The minimum value
 * @param {number | undefined} max - The maximum value
 * @returns {number} - The clamped value
 */
export const clamp = (value: number, min: number | undefined, max: number | undefined): number => {
  if (min === undefined && max === undefined) {
    return value
  }

  if (min !== undefined && max === undefined) {
    return Math.max(value, min)
  }

  if (min === undefined && max !== undefined) {
    return Math.min(value, max)
  }

  return Math.min(Math.max(value, min!), max!)
}
