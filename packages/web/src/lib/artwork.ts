/** Sizes the server's artwork route serves (packages/server/src/Artwork.ts). */
const sizes = [64, 128, 256, 512]

/**
 * A feed image through the server: resized to the next size up from what is drawn
 * (at 2× for sharp screens), same-origin and cacheable offline.
 */
export const artworkSrc = (url: string, drawnAt: number) => {
  const wanted = drawnAt * 2
  const size = sizes.find((s) => s >= wanted) ?? 512
  return `/api/artwork?size=${size}&url=${encodeURIComponent(url)}`
}
