import { useAtomValue } from "@effect/atom-react"
import { createFileRoute } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { ListMusic } from "lucide-react"
import { entryEpisodesAtom } from "../../app/data.ts"
import { stateAtom } from "../../app/runtime.ts"
import { ListRow, PlayingBadge } from "../../components/lists/ListRow.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"

export const Route = createFileRoute("/playlists/")({ component: PlaylistsList })

const entries = (n: number) => `${n} ${n === 1 ? "Entry" : "Entries"}`

function PlaylistsList() {
  const state = AsyncResult.getOrElse(useAtomValue(stateAtom), () => null)
  const episodes = AsyncResult.getOrElse(useAtomValue(entryEpisodesAtom), () => new Map())
  return (
    <>
      <PageHeader title="Playlists" />
      <div className="px-3 md:px-6">
        {state?.playlists.map((p) => {
          const active = p.id === state.activePlaylistId
          const current = p.cursor === null ? undefined : episodes.get(p.cursor)
          const lines = [
            ...(current ? [`${active ? "Now" : "Paused on"}: ${current.title}`] : []),
            `${entries(p.entries.length)} · ${p.clearOnPlayed ? "Clear on Played" : "Keeps Entries"}`
          ]
          return (
            <ListRow
              key={p.id}
              link={{ to: "/playlists/$playlistId", params: { playlistId: p.id } }}
              icon={<ListMusic aria-hidden="true" className="size-5" />}
              title={p.name}
              badge={active ? <PlayingBadge /> : undefined}
              lines={lines}
            />
          )
        })}
      </div>
    </>
  )
}
