import { Toast } from "@base-ui/react/toast"
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Operation, type PlaybackSettings } from "@podlist/domain"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Exit, Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { type ReactNode, useId, useState } from "react"
import { filterEpisodesAtom, subscriptionAtom } from "../../app/data.ts"
import { useAppState } from "../../app/hooks.ts"
import { unsubscribeAtom } from "../../app/library.ts"
import { deviceIdAtom, recordAtom } from "../../app/runtime.ts"
import { BulkBar } from "../../components/episodes/BulkBar.tsx"
import { EpisodeList } from "../../components/episodes/EpisodeList.tsx"
import { ConfirmDialog } from "../../components/feedback/ConfirmDialog.tsx"
import { EmptyState, LoadingRows } from "../../components/lists/ListRow.tsx"
import { Artwork } from "../../components/shell/Artwork.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"

// One Subscription (docs/design/ui-layout.md › Library and Subscriptions): its settings —
// the Played threshold in seconds and Playback Settings overrides, each "Default" until
// changed — Mark all Played, Unsubscribe, and its Episodes.

export const Route = createFileRoute("/library/$subscriptionId")({ component: SubscriptionScreen })

const decodeChange = Schema.decodeUnknownSync(Operation.Change)
const speeds = [0.8, 1, 1.2, 1.5, 1.75, 2, 2.5, 3]
const skips = [0, 15, 30, 45, 60, 90, 120]
const thresholds = [0, 10, 30, 60, 120, 300]
const control =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-card px-2.5 text-row text-foreground"

function Row({
  label,
  htmlFor,
  help,
  children
}: {
  readonly label: string
  readonly htmlFor: string
  readonly help?: string
  readonly children: ReactNode
}) {
  return (
    <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 last:border-b-0">
      <label htmlFor={htmlFor} className="min-w-36 flex-1 text-row font-medium">
        {label}
        {help && <span className="block text-small font-normal text-muted-foreground">{help}</span>}
      </label>
      <div className="w-full sm:w-56">{children}</div>
    </div>
  )
}

function SubscriptionScreen() {
  const { subscriptionId } = Route.useParams()
  const navigate = Route.useNavigate()
  const id = useId()
  const result = useAtomValue(subscriptionAtom(subscriptionId))
  const subscription = AsyncResult.getOrElse(result, () => null)
  const episodesResult = useAtomValue(
    filterEpisodesAtom(
      JSON.stringify({
        filter: { podcasts: { mode: "include", subscriptionIds: [subscriptionId] } },
        sort: "publishedDesc",
        limit: null
      })
    )
  )
  const episodes = AsyncResult.getOrElse(episodesResult, () => [])
  const record = useAtomSet(recordAtom)
  const state = useAppState()
  const deviceId = AsyncResult.getOrElse(useAtomValue(deviceIdAtom), () => "")
  const unsubscribe = useAtomSet(unsubscribeAtom, { mode: "promiseExit" })
  const toasts = Toast.useToastManager()
  const [asking, setAsking] = useState<"unsubscribe" | "played" | null>(null)
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())

  if (AsyncResult.isInitial(result)) return <LoadingRows label="Loading Subscription" />
  if (subscription === null) {
    return (
      <>
        <PageHeader title="Subscription" back={{ to: "/library", label: "Library" }} />
        <EmptyState title="This podcast isn’t in your Library">
          <Link to="/library" className="font-medium text-primary underline underline-offset-2">
            See your Library
          </Link>
        </EmptyState>
      </>
    )
  }
  const overrides = subscription.playbackSettings
  const rule = state?.downloadRules.find(
    (r) => r.subscriptionId === subscriptionId && r.deviceId === deviceId
  ) ?? { mode: "never" as const, keepAtMost: null }
  const setRule = (mode: "never" | "onEntry" | "allNew", keepAtMost: number | null) =>
    record(
      decodeChange({
        _tag: "SetDownloadRule",
        rule: { subscriptionId, deviceId, mode, keepAtMost: mode === "allNew" ? keepAtMost : null }
      })
    )
  const setOverrides = (
    playbackSettings: PlaybackSettings.PlaybackSettingsOverride,
    playedThreshold: number | null = subscription.playedThreshold
  ) =>
    record(
      decodeChange({
        _tag: "SetSubscriptionOverrides",
        subscriptionId,
        playbackSettings,
        playedThreshold
      })
    )
  const withOverride = <K extends keyof PlaybackSettings.PlaybackSettingsOverride>(
    key: K,
    value: PlaybackSettings.PlaybackSettingsOverride[K] | undefined
  ) => {
    const next: Record<string, unknown> = { ...overrides }
    if (value === undefined) delete next[key]
    else next[key] = value
    setOverrides(next as PlaybackSettings.PlaybackSettingsOverride)
  }

  return (
    <>
      <PageHeader
        title={subscription.title}
        back={{ to: "/library", label: "Library" }}
        subtitle={[
          subscription.author,
          `${subscription.episodes} Episodes · ${subscription.unplayed} unplayed`
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          checked.size > 0 ? (
            <BulkBar selected={[...checked]} onClear={() => setChecked(new Set())} />
          ) : undefined
        }
      />
      <div className="grid max-w-[1100px] gap-6 px-4 pb-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby={`${id}-settings`} className="lg:order-2">
          <div className="flex items-center gap-4">
            <Artwork url={subscription.artworkUrl} name={subscription.title} size={72} />
            {subscription.description && (
              <p className="line-clamp-4 text-small text-muted-foreground">
                {subscription.description}
              </p>
            )}
          </div>
          <h2
            id={`${id}-settings`}
            className="mt-5 px-1 pb-1.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
          >
            Settings for this podcast
          </h2>
          <div className="rounded-xl border bg-card">
            <Row
              label="Downloads on this Device"
              htmlFor={`${id}-rule`}
              help={
                rule.mode === "never"
                  ? "Episodes play from the internet"
                  : rule.mode === "onEntry"
                    ? "Stored while they’re in a Playlist"
                    : "Stored as they’re published, until Played"
              }
            >
              <select
                id={`${id}-rule`}
                disabled={deviceId === ""}
                value={rule.mode}
                onChange={(event) =>
                  setRule(event.target.value as "never" | "onEntry" | "allNew", rule.keepAtMost)
                }
                className={control}
              >
                <option value="never">Stream</option>
                <option value="onEntry">Entries</option>
                <option value="allNew">Every new Episode</option>
              </select>
              {rule.mode === "allNew" && (
                <select
                  aria-label="Keep at most"
                  value={rule.keepAtMost === null ? "" : String(rule.keepAtMost)}
                  onChange={(event) =>
                    setRule("allNew", event.target.value === "" ? null : Number(event.target.value))
                  }
                  className={`${control} mt-2`}
                >
                  {[3, 5, 10, 20].map((n) => (
                    <option key={n} value={n}>
                      Keep the newest {n}
                    </option>
                  ))}
                  <option value="">Keep all new ones</option>
                </select>
              )}
            </Row>
            <Row
              label="Played"
              htmlFor={`${id}-threshold`}
              help="How close to the end counts as finished"
            >
              <select
                id={`${id}-threshold`}
                value={
                  subscription.playedThreshold === null ? "" : String(subscription.playedThreshold)
                }
                onChange={(event) =>
                  setOverrides(
                    overrides,
                    event.target.value === "" ? null : Number(event.target.value)
                  )
                }
                className={control}
              >
                <option value="">Default (30 seconds)</option>
                {thresholds.map((s) => (
                  <option key={s} value={s}>
                    {s === 0 ? "At the very end" : `Last ${s} seconds`}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Speed" htmlFor={`${id}-speed`}>
              <select
                id={`${id}-speed`}
                value={overrides.speed === undefined ? "" : String(overrides.speed)}
                onChange={(event) =>
                  withOverride(
                    "speed",
                    event.target.value === "" ? undefined : Number(event.target.value)
                  )
                }
                className={control}
              >
                <option value="">Default</option>
                {speeds.map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Skip intro" htmlFor={`${id}-intro`}>
              <select
                id={`${id}-intro`}
                value={overrides.skipIntro === undefined ? "" : String(overrides.skipIntro)}
                onChange={(event) =>
                  withOverride(
                    "skipIntro",
                    event.target.value === ""
                      ? undefined
                      : (Number(
                          event.target.value
                        ) as PlaybackSettings.PlaybackSettingsOverride["skipIntro"])
                  )
                }
                className={control}
              >
                <option value="">Default</option>
                {skips.map((s) => (
                  <option key={s} value={s}>
                    {s === 0 ? "Off" : `${s} seconds`}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Skip outro" htmlFor={`${id}-outro`}>
              <select
                id={`${id}-outro`}
                value={overrides.skipOutro === undefined ? "" : String(overrides.skipOutro)}
                onChange={(event) =>
                  withOverride(
                    "skipOutro",
                    event.target.value === ""
                      ? undefined
                      : (Number(
                          event.target.value
                        ) as PlaybackSettings.PlaybackSettingsOverride["skipOutro"])
                  )
                }
                className={control}
              >
                <option value="">Default</option>
                {skips.map((s) => (
                  <option key={s} value={s}>
                    {s === 0 ? "Off" : `${s} seconds`}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Volume boost" htmlFor={`${id}-boost`}>
              <select
                id={`${id}-boost`}
                value={overrides.volumeBoost === undefined ? "" : String(overrides.volumeBoost)}
                onChange={(event) =>
                  withOverride(
                    "volumeBoost",
                    event.target.value === "" ? undefined : event.target.value === "true"
                  )
                }
                className={control}
              >
                <option value="">Default</option>
                <option value="true">On</option>
                <option value="false">Off</option>
              </select>
            </Row>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={subscription.unplayed === 0}
              onClick={() => setAsking("played")}
              className="h-10 rounded-full bg-secondary px-4 text-row font-medium hover:bg-input disabled:opacity-50"
            >
              Mark all Played
            </button>
            {subscription.subscribed && (
              <button
                type="button"
                onClick={() => setAsking("unsubscribe")}
                className="h-10 rounded-full px-4 text-row font-medium text-destructive hover:bg-secondary"
              >
                Unsubscribe
              </button>
            )}
          </div>
        </section>
        <section aria-label="Episodes" className="min-w-0 lg:order-1">
          {!AsyncResult.isInitial(episodesResult) && episodes.length === 0 ? (
            <EmptyState title="No Episodes yet">
              New Episodes appear when the podcast publishes.
            </EmptyState>
          ) : (
            <div className="-mx-4 md:-mx-8">
              <EpisodeList
                episodes={episodes}
                label={`${subscription.title} Episodes`}
                ready={!AsyncResult.isInitial(episodesResult)}
                onOpen={(episodeId) =>
                  void navigate({ to: "/episodes/$episodeId", params: { episodeId } })
                }
                checked={checked}
                setChecked={(update) => setChecked(update(checked))}
              />
            </div>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={asking === "played"}
        onOpenChange={(open) => setAsking(open ? "played" : null)}
        title="Mark all Played?"
        confirm="Mark all Played"
        onConfirm={() => {
          record(decodeChange({ _tag: "MarkSubscriptionPlayed", subscriptionId }))
          toasts.add({ description: `Marked ${subscription.title} Played`, timeout: 4000 })
        }}
      >
        All {subscription.unplayed} unplayed Episodes of {subscription.title} become Played, and
        Playlists with Clear on Played let them go.
      </ConfirmDialog>
      <ConfirmDialog
        open={asking === "unsubscribe"}
        onOpenChange={(open) => setAsking(open ? "unsubscribe" : null)}
        title={`Unsubscribe from ${subscription.title}?`}
        confirm="Unsubscribe"
        destructive
        onConfirm={async () => {
          const exit = await unsubscribe(subscriptionId)
          if (Exit.isFailure(exit)) {
            toasts.add({
              description: "Couldn’t unsubscribe. Check that you’re online.",
              timeout: 5000
            })
            return
          }
          toasts.add({ description: `Unsubscribed from ${subscription.title}`, timeout: 4000 })
          await navigate({ to: "/library" })
        }}
      >
        Its Episodes leave your Library, except ones in a Playlist or Starred, which stay until you
        remove them. Downloads stay on your Devices.
      </ConfirmDialog>
    </>
  )
}
