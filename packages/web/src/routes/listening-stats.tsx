import { useAtomValue } from "@effect/atom-react"
import { Listening } from "@podlist/domain"
import { createFileRoute } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { useEffect, useState } from "react"
import { statsCatalogueAtom } from "../app/data.ts"
import { useAppState, useLibraryReady } from "../app/hooks.ts"
import { LoadingRows } from "../components/lists/ListRow.tsx"
import { PageHeader } from "../components/shell/PageHeader.tsx"

export const Route = createFileRoute("/listening-stats")({ component: ListeningStats })

const duration = (seconds: number) => {
  if (seconds > 0 && seconds < 60) return "Less than 1 min"
  const minutes = Math.floor(seconds / 60)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr ${minutes % 60} min`
}
const minutes = (seconds: number) =>
  seconds > 0 && seconds < 6 ? "<0.1" : (seconds / 60).toFixed(1)
const dateLabel = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })

function ListeningStats() {
  const state = useAppState()
  const ready = useLibraryReady()
  const catalogue = useAtomValue(statsCatalogueAtom)
  const [now, setNow] = useState(() => new Date())
  // Refresh calendar periods across midnight, including while this screen stays open.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])
  if (
    state === null ||
    !ready ||
    !AsyncResult.isSuccess(catalogue) ||
    AsyncResult.isWaiting(catalogue)
  ) {
    return (
      <>
        <PageHeader
          title="Listening stats"
          backOnDesktop
          back={{ to: "/settings", label: "Settings" }}
        />
        <LoadingRows label="Loading listening stats" />
      </>
    )
  }
  const played = Object.values(state.episodeStates).flatMap((e) =>
    catalogue.value.episodes.has(e.episodeId) && e.played !== null ? [e.played] : []
  )
  const stats = Listening.stats(state.listeningLog ?? {}, played, now)
  const empty = stats.totals.every((p) => p.seconds === 0 && p.finished === 0)
  const maximum = Math.max(60, ...stats.days.map((d) => d.seconds))
  return (
    <>
      <PageHeader
        title="Listening stats"
        backOnDesktop
        back={{ to: "/settings", label: "Settings" }}
      />
      <div className="max-w-5xl space-y-8 px-5 pb-10 md:px-8">
        <p className="max-w-prose text-small text-muted-foreground">
          Your Listening log keeps daily listening across Devices, even after a Playlist leaves the
          Trash. Time starts recording with this update. Weeks start on Monday; days follow the
          Device you listened on.
        </p>
        {empty && (
          <section className="rounded-xl border p-4">
            <h2 className="text-row font-semibold">Your stats start here…</h2>
            <p className="mt-1 text-small text-muted-foreground">
              Play an Episode to start your Listening log. Every little listen counts.
            </p>
          </section>
        )}
        <section aria-labelledby="stats-periods">
          <h2 id="stats-periods" className="mb-3 text-lg font-semibold">
            Time listened and Episodes finished
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.totals.map((period, i) => (
              <section
                key={["This week", "This month", "All time"][i]}
                aria-label={["This week", "This month", "All time"][i]}
                className="min-w-0 rounded-xl border p-4"
              >
                <h3 className="font-medium">{["This week", "This month", "All time"][i]}</h3>
                <dl className="mt-3 space-y-3">
                  <div>
                    <dt className="text-small text-muted-foreground">Time listened</dt>
                    <dd className="text-xl font-semibold tabular-nums">
                      {duration(period.seconds)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-small text-muted-foreground">Episodes finished</dt>
                    <dd className="text-xl font-semibold tabular-nums">{period.finished}</dd>
                  </div>
                </dl>
              </section>
            ))}
          </div>
          <p className="mt-3 max-w-prose text-small text-muted-foreground">
            Episodes finished counts Episodes in your Library currently Played through listening, by
            their Played date. Episodes marked Played by hand are excluded. Rewind or marking
            Unplayed changes that count; time listened stays.
          </p>
        </section>
        <section aria-labelledby="stats-days">
          <h2 id="stats-days" className="text-lg font-semibold">
            Minutes listened by day
          </h2>
          <p className="mt-1 text-small">
            Last 30 days · Current streak:{" "}
            <strong>
              {stats.streak} {stats.streak === 1 ? "day" : "days"}
            </strong>
          </p>
          <p className="mt-1 text-small text-muted-foreground">
            Consecutive days with listening, ending today or yesterday.
          </p>
          {/* Static bars have a complete table alternative and a visible border in forced colours. */}
          <div aria-hidden="true" className="mt-4 flex h-32 items-end gap-0.5 border-b">
            {stats.days.map((d) => (
              <div
                key={d.day}
                className="min-w-0 flex-1 border border-current bg-primary forced-colors:bg-[Highlight]"
                style={{
                  height: `${(d.seconds / maximum) * 100}%`,
                  minHeight: d.seconds > 0 ? 2 : 0,
                  borderWidth: d.seconds > 0 ? 1 : 0
                }}
              />
            ))}
          </div>
          <div
            aria-hidden="true"
            className="mt-1 flex justify-between gap-2 text-small text-muted-foreground"
          >
            <span>{dateLabel(stats.days[0]?.day ?? "")}</span>
            <span>{dateLabel(stats.days.at(-1)?.day ?? "")}</span>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer rounded px-1 py-2 font-medium">
              Daily listening table
            </summary>
            <table className="mt-2 w-full max-w-lg text-small">
              <caption className="sr-only">Minutes listened on each of the last 30 days</caption>
              <thead>
                <tr className="border-b text-left">
                  <th scope="col" className="py-2">
                    Day
                  </th>
                  <th scope="col" className="py-2 text-right">
                    Minutes listened
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.days.map((d) => (
                  <tr key={d.day} className="border-b">
                    <th scope="row" className="py-2 text-left font-normal">
                      <time dateTime={d.day}>{dateLabel(d.day)}</time>
                    </th>
                    <td className="py-2 text-right tabular-nums">{minutes(d.seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
        <section aria-labelledby="stats-podcasts">
          <h2 id="stats-podcasts" className="mb-3 text-lg font-semibold">
            Top podcasts by time listened
          </h2>
          <p className="mb-2 text-small text-muted-foreground">All time</p>
          {stats.podcasts.length === 0 ? (
            <p className="text-small text-muted-foreground">
              Podcasts appear here when you listen.
            </p>
          ) : (
            <ol className="divide-y">
              {stats.podcasts.slice(0, 10).map(([id, seconds]) => (
                <li key={id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
                  <span className="min-w-0 basis-40 grow break-words font-medium">
                    {catalogue.value.podcasts.get(id) ?? "Removed Subscription"}
                  </span>
                  <span className="text-small tabular-nums">{duration(seconds)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  )
}
