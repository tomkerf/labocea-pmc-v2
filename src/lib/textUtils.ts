/** Normalise une chaîne pour un matching insensible à la casse et aux accents. */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}
