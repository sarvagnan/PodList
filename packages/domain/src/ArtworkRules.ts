import type { Artwork, Episode, Subscription } from "./Library.ts"
import type { Seconds } from "./Units.ts"

export type ArtworkLevel = "chapter" | "episode" | "podcast"

/**
 * The image to show for what is playing: the most specific one available wins —
 * the current Chapter's, then the Episode's, then the podcast's (CONTEXT.md › Artwork).
 * `position` picks the Chapter; omit it to ignore Chapter art.
 */
export const resolve = (
  subscription: Subscription,
  episode: Episode,
  position?: Seconds
): { readonly artwork: Artwork | null; readonly level: ArtworkLevel | null } => {
  if (position !== undefined) {
    const chapter = episode.chapters.findLast((c) => c.start <= position)
    if (chapter?.artwork) return { artwork: chapter.artwork, level: "chapter" }
  }
  if (episode.artwork) return { artwork: episode.artwork, level: "episode" }
  if (subscription.artwork) return { artwork: subscription.artwork, level: "podcast" }
  return { artwork: null, level: null }
}
