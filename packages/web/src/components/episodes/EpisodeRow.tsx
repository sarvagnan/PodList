import { Check, Star } from "lucide-react"
import type { ViewEpisode } from "../../app/data.ts"
import { formatLength, formatPublished } from "../../lib/time.ts"
import { Artwork } from "../shell/Artwork.tsx"

/** One Episode in a View: artwork, title, podcast · date · length, Played and Star. */
export function EpisodeRow({ episode }: { readonly episode: ViewEpisode }) {
  const meta = [
    episode.podcast,
    formatPublished(episode.published),
    ...(episode.duration ? [formatLength(episode.duration)] : [])
  ].join(" · ")
  return (
    <div className="flex h-[76px] items-center gap-3 border-b px-2">
      <Artwork url={episode.artworkUrl} name={episode.podcast} size={48} />
      <div className="min-w-0 flex-1">
        <p
          className={`line-clamp-2 text-[15px] leading-snug font-medium ${episode.played ? "text-muted-foreground" : ""}`}
        >
          {episode.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          {episode.played && (
            <span className="inline-flex items-center gap-0.5 font-medium text-positive">
              <Check aria-hidden="true" className="size-3.5" />
              Played
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
            </span>
          )}
          <span className="truncate">{meta}</span>
        </p>
      </div>
      {episode.starred && (
        <Star aria-label="Starred" className="size-4 shrink-0 fill-star text-star" />
      )}
    </div>
  )
}
