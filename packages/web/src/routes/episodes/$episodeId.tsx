import { useAtomValue } from "@effect/atom-react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { ChevronLeft } from "lucide-react"
import { useEffect } from "react"
import { episodeDetailAtom } from "../../app/data.ts"
import { EpisodeDetail } from "../../components/episodes/EpisodeDetail.tsx"

export const Route = createFileRoute("/episodes/$episodeId")({ component: EpisodeScreen })

/** The Episode screen (phone, or any width from a link). Back returns wherever it came from. */
function EpisodeScreen() {
  const { episodeId } = Route.useParams()
  const router = useRouter()
  const detail = AsyncResult.getOrElse(useAtomValue(episodeDetailAtom(episodeId)), () => null)
  useEffect(() => {
    if (detail) document.title = `${detail.title} · PodList`
  }, [detail])
  return (
    <>
      <header className="px-5 pt-4 pb-2 md:px-8 md:pt-8">
        <button
          type="button"
          onClick={() =>
            router.history.canGoBack() ? router.history.back() : router.navigate({ to: "/views" })
          }
          className="-ml-2 inline-flex h-11 items-center gap-0.5 pr-3 text-row font-medium text-primary"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
          Back
        </button>
        {/* The screen's heading, for focus on arrival; the Episode title follows. */}
        <h1 tabIndex={-1} className="sr-only">
          Episode
        </h1>
      </header>
      <div className="md:px-3">
        <EpisodeDetail episodeId={episodeId} />
      </div>
    </>
  )
}
