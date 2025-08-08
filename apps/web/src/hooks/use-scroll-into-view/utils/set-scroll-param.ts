interface ScrollParam {
  axis: "x" | "y"
  parent?: HTMLElement
  distance: number
}

export const setScrollParam = ({ axis, parent, distance }: ScrollParam): void => {
  if (!parent && typeof document === "undefined") {
    return
  }

  const method = axis === "y" ? "scrollTop" : "scrollLeft"

  if (parent) {
    parent[method] = distance
  } else {
    const { body, documentElement } = document
    body[method] = distance
    documentElement[method] = distance
  }
}
