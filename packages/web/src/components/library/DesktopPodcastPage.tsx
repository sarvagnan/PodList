import { useAtomSet, useAtomValue } from "@effect/atom-react"
import type { Subscriptions } from "@podlist/api"
import { Mentions } from "@podlist/domain"
import { Link } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { useEffect, useMemo, useRef, useState } from "react"
import { subscriptionsAtom } from "../../app/data.ts"
import { useAppState, useNextLastTarget } from "../../app/hooks.ts"
import {
  bringEpisodeAtom,
  readPodcastAtom,
  subscribeAtom,
  unsubscribeAtom
} from "../../app/library.ts"
import { showNotesText } from "../../lib/showNotes.ts"
import { formatLength, formatPublished } from "../../lib/time.ts"
import { useEpisodeActions } from "../episodes/useEpisodeActions.ts"
import { useConfirm } from "../feedback/useConfirm.ts"
import { Artwork } from "../shell/Artwork.tsx"
import { PageHeader } from "../shell/PageHeader.tsx"
import { SubscriptionButton } from "./SubscriptionButton.tsx"

const actionClass =
  "rounded-full bg-secondary px-3 py-2 text-row font-medium hover:bg-input disabled:opacity-60"
const failure = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback

const publisherLink = (value: string | null | undefined) => {
  if (!value) return null
  try {
    const url = new URL(value)
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}

type PodcastLoad =
  | { readonly kind: "loading" }
  | { readonly kind: "failed"; readonly message: string }
  | { readonly kind: "loaded"; readonly podcast: Subscriptions.PodcastFeed }

export function DesktopPodcastPage({ feedUrl }: { readonly feedUrl: string }) {
  const read = useAtomSet(readPodcastAtom, { mode: "promise" })
  const [loading, setLoading] = useState<PodcastLoad>({ kind: "loading" })
  const [attempt, setAttempt] = useState(0)
  const heading = useRef<HTMLDivElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry deliberately restarts the same feed request.
  useEffect(() => {
    let active = true
    void read(feedUrl).then(
      (podcast) => {
        if (active) setLoading({ kind: "loaded", podcast })
      },
      (cause: unknown) => {
        if (active)
          setLoading({
            kind: "failed",
            message: failure(cause, "Could not read the feed. Try again.")
          })
      }
    )
    return () => {
      active = false
    }
  }, [feedUrl, read, attempt])
  useEffect(() => {
    if (loading.kind !== "loading") heading.current?.querySelector("h1")?.focus()
  }, [loading])

  return (
    <div ref={heading} className="max-w-[960px]">
      {loading.kind === "loaded" ? (
        <LoadedPodcast feedUrl={feedUrl} podcast={loading.podcast} />
      ) : (
        <PageHeader title="Podcast" />
      )}
      <div className="px-5 md:px-8">
        <Link
          to="/library"
          search={{ add: true }}
          className="text-row font-medium text-primary underline"
        >
          Add Podcasts
        </Link>
        {loading.kind === "loading" && <p role="status">Reading the feed…</p>}
        {loading.kind === "failed" && (
          <>
            <p role="alert" className="my-2 text-destructive">
              {loading.message}
            </p>
            <button
              type="button"
              className={actionClass}
              onClick={() => {
                setLoading({ kind: "loading" })
                setAttempt((previous) => previous + 1)
              }}
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function LoadedPodcast({
  feedUrl,
  podcast
}: {
  readonly feedUrl: string
  readonly podcast: Subscriptions.PodcastFeed
}) {
  const subscriptions = AsyncResult.getOrElse(useAtomValue(subscriptionsAtom), () => [])
  const subscription = subscriptions.find((sub) => sub.feedUrl === feedUrl)
  const state = useAppState()
  const active = state?.playlists.find((playlist) => playlist.id === state.activePlaylistId)
  const target = useNextLastTarget()
  const subscribe = useAtomSet(subscribeAtom, { mode: "promise" })
  const unsubscribe = useAtomSet(unsubscribeAtom, { mode: "promise" })
  const bring = useAtomSet(bringEpisodeAtom, { mode: "promise" })
  const run = useEpisodeActions()
  const confirm = useConfirm()
  const [query, setQuery] = useState("")
  const [limit, setLimit] = useState(50)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [episodeProblem, setEpisodeProblem] = useState<{ guid: string; message: string } | null>(
    null
  )
  const [pending, setPending] = useState<string | null>(null)
  const descriptions = useMemo(
    () => (podcast.description ? showNotesText(podcast.description) : []),
    [podcast.description]
  )
  const episodes = useMemo(() => {
    const unique = new Map(podcast.episodes.map((episode) => [episode.guid, episode]))
    return [...unique.values()]
      .sort((left, right) => right.published - left.published)
      .map((episode) => ({
        episode,
        searchable: Mentions.fold(
          `${episode.title} ${showNotesText(episode.description).join(" ")}`
        )
      }))
  }, [podcast.episodes])
  const words = Mentions.fold(query.trim()).split(/\s+/).filter(Boolean)
  const matching = episodes.filter(({ searchable }) =>
    words.every((word) => searchable.includes(word))
  )
  const website = publisherLink(podcast.link)

  const changeSubscription = async (id: string | undefined) => {
    if (busy) return
    setBusy(true)
    setProblem(null)
    try {
      const apply = async () => {
        if (id) {
          await unsubscribe(id)
          return {
            message: `Unsubscribed from “${podcast.title}”`,
            undo: [],
            undoAsync: async () => {
              await subscribe(feedUrl)
            }
          }
        }
        const saved = await subscribe(feedUrl)

        return {
          message: `Subscribed to “${podcast.title}”`,
          undo: [],
          undoAsync: async () => {
            await unsubscribe(saved.id)
          }
        }
      }
      confirm(await apply(), apply)
    } catch (cause) {
      setProblem(failure(cause, "Could not change this Subscription. Try again."))
    } finally {
      setBusy(false)
    }
  }

  const act = async (guid: string, action: "play" | "next" | "last") => {
    if (pending || !active || !target) return
    setPending(guid)
    setEpisodeProblem(null)
    try {
      const episodeId = await bring({ feedUrl, guid })
      await run(
        action === "play"
          ? { _tag: "PlayNow", episodeId }
          : { _tag: "Add", episodeId, playlistId: target.id, placement: action }
      )
    } catch (cause) {
      setEpisodeProblem({ guid, message: failure(cause, "Could not add this Episode. Try again.") })
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <PageHeader
        title={podcast.title}
        {...(podcast.author ? { subtitle: podcast.author } : {})}
        actions={
          <SubscriptionButton
            title={podcast.title}
            subscribed={subscription !== undefined}
            busy={busy}
            armSeconds={4}
            onSubscribe={() => void changeSubscription(undefined)}
            onUnsubscribe={() => void changeSubscription(subscription?.id)}
          />
        }
      />
      <div className="px-5 md:px-8">
        {problem && (
          <p role="alert" className="text-destructive">
            {problem}
          </p>
        )}
        <div className="flex items-start gap-4">
          <Artwork url={podcast.artworkUrl} name={podcast.title} size={80} />
          <div className="min-w-0 space-y-2 text-row">
            {descriptions.length > 0 && (
              <p className="whitespace-pre-line">{descriptions.join("\n\n")}</p>
            )}
            {website && (
              <a href={website} className="font-medium text-primary underline">
                Podcast Website
              </a>
            )}
            {subscription && (
              <Link
                to="/library/$subscriptionId"
                params={{ subscriptionId: subscription.id }}
                className="ml-3 font-medium text-primary underline"
              >
                Subscription Settings
              </Link>
            )}
          </div>
        </div>
        <label className="my-4 block text-row font-medium">
          Search Episodes
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setLimit(50)
            }}
            className="mt-1 block min-h-10 w-full rounded-lg border border-field bg-card px-3"
          />
        </label>
        {matching.length === 0 && (
          <p>{query.trim() ? "No Episodes match your search." : "No Episodes in this feed."}</p>
        )}
        <ul aria-label="Episodes">
          {matching.slice(0, limit).map(({ episode }) => (
            <li key={episode.guid} className="border-b py-3 last:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-48 flex-1">
                  <h2 className="font-medium">{episode.title}</h2>
                  <p className="text-small text-muted-foreground">
                    {[
                      episode.published > 0 ? formatPublished(episode.published) : null,
                      episode.duration === null ? null : formatLength(episode.duration)
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <fieldset className="flex flex-wrap items-center gap-2">
                  <legend className="sr-only">{episode.title}</legend>
                  <button
                    type="button"
                    className={actionClass}
                    disabled={!active || pending !== null}
                    onClick={() => void act(episode.guid, "play")}
                  >
                    Play Now
                  </button>
                  <button
                    type="button"
                    className={actionClass}
                    disabled={!active || pending !== null}
                    onClick={() => void act(episode.guid, "next")}
                  >
                    Play Next
                  </button>
                  <button
                    type="button"
                    className={actionClass}
                    disabled={!active || pending !== null}
                    onClick={() => void act(episode.guid, "last")}
                  >
                    Play Last
                  </button>
                </fieldset>
              </div>
              {pending === episode.guid && <p role="status">Adding Episode…</p>}
              {episodeProblem?.guid === episode.guid && (
                <p role="alert" className="text-destructive">
                  {episodeProblem.message}
                </p>
              )}
            </li>
          ))}
        </ul>
        {matching.length > limit && (
          <button
            type="button"
            className={actionClass}
            onClick={() => setLimit((previous) => previous + 50)}
          >
            Show More Episodes
          </button>
        )}
      </div>
    </>
  )
}
