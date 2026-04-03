export function toTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return word
      return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`
    })
    .join(" ")
}
