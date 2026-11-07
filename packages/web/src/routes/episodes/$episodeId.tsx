import { useAtomValue } from "@effect/atom-react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { ChevronLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { episodeDetailAtom } from "../../app/data.ts"
import { useAppState } from "../../app/hooks.ts"
import { EpisodeDetail } from "../../components/episodes/EpisodeDetail.tsx"
import { cameFrom } from "../../lib/cameFrom.ts"

export const Route = createFileRoute("/episodes/$episodeId")({ component: EpisodeScreen })

/** The Episode screen (phone, or any width from a link). Back returns wherever it came from. */
function EpisodeScreen() {
  const { episodeId } = Route.useParams()
  const router = useRouter()
  const state = useAppState()
  // The screen it was opened from names the back link; fixed when this screen opens.
  const [from] = useState(cameFrom.get)
  const backLabel = (() => {
    const [, section, id] = from?.split("/") ?? []
    if (section === "views" && id) return state?.views.find((v) => v.id === id)?.name ?? "View"
    if (section === "playlists" && id)
      return state?.playlists.find((p) => p.id === id)?.name ?? "Playlist"
    if (section === "library" && id) return "Podcast"
    if (section === "views") return "Views"
    if (section === "playlists") return "Playlists"
    if (section === "library") return "Library"
    if (section === "search") return "Search"
    // Opened directly: Back has nowhere earlier to go, so it leads to Views.
    return "Views"
  })()
  const detail = AsyncResult.getOrElse(useAtomValue(episodeDetailAtom(episodeId)), () => null)
  useEffect(() => {
    if (detail) document.title = `${detail.title} · PodList`
  }, [detail])
  return (
    <>
      <header className="px-5 pt-4 pb-2 md:px-8 md:pt-8">
        {/* A link, like every other back control: its address is where it leads; a plain
            click goes Back through history, so the list keeps its place. */}
        <a
          href={from ?? "/views"}
          onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
            event.preventDefault()
            if (router.history.canGoBack()) router.history.back()
            else void router.navigate({ to: "/views" })
          }}
          className="-ml-2 inline-flex h-11 items-center gap-0.5 pr-3 text-row font-medium text-primary"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
          {backLabel}
        </a>
      </header>
      <div className="md:px-3">
        {/* Its title is the screen's heading (h1). */}
        <EpisodeDetail episodeId={episodeId} heading="h1" />
      </div>
    </>
  )
}
