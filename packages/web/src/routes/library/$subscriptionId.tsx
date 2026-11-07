import { Toast } from "@base-ui/react/toast"
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Operation, type PlaybackSettings } from "@podlist/domain"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Exit, Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { ChevronRight } from "lucide-react"
import { useId, useState } from "react"
import { filterEpisodesAtom, subscriptionAtom } from "../../app/data.ts"
import { bulkActionAtom } from "../../app/episodeActions.ts"
import { useAppState } from "../../app/hooks.ts"
import { unsubscribeAtom } from "../../app/library.ts"
import { deviceIdAtom, recordAtom } from "../../app/runtime.ts"
import { BulkBar } from "../../components/episodes/BulkBar.tsx"
import { EpisodeList } from "../../components/episodes/EpisodeList.tsx"
import { ConfirmDialog } from "../../components/feedback/ConfirmDialog.tsx"
import { useConfirm } from "../../components/feedback/useConfirm.ts"
import { EmptyState, LoadingRows } from "../../components/lists/ListRow.tsx"
import { fieldControl, SettingsRow } from "../../components/lists/SettingsRow.tsx"
import { Artwork } from "../../components/shell/Artwork.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"
import { subscriptionSettingsOpen } from "../../lib/remembered.ts"
import { useMinWidth } from "../../lib/useWide.ts"

// One Subscription (docs/design/ui-layout.md › Library and Subscriptions): its settings —
// the Played threshold in seconds and Playback Settings overrides, each "Default" until
// changed — Mark all Played, Unsubscribe, and its Episodes.

export const Route = createFileRoute("/library/$subscriptionId")({ component: SubscriptionScreen })

const decodeChange = Schema.decodeUnknownSync(Operation.Change)
const speeds = [0.8, 1, 1.2, 1.5, 1.75, 2, 2.5, 3]
const skips = [0, 15, 30, 45, 60, 90, 120]
const thresholds = [0, 10, 30, 60, 120, 300]

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
  // One step with Undo, like other reversible edits: Undo also returns the Entries that
  // Playlists with Clear on Played let go (the bulk action works that out).
  const runBulk = useAtomSet(bulkActionAtom, { mode: "promise" })
  const confirm = useConfirm()
  const markAllPlayed = async () => {
    if (subscription === null) return
    const actions = episodes
      .filter((e) => !e.played)
      .map((e) => ({ _tag: "Played" as const, episodeId: e.id, played: true }))
    if (actions.length === 0) return
    const again = () => runBulk({ actions, message: `Marked ${subscription.title} Played` })
    confirm(await again(), again)
  }
  const record = useAtomSet(recordAtom)
  const state = useAppState()
  const deviceId = AsyncResult.getOrElse(useAtomValue(deviceIdAtom), () => "")
  const unsubscribe = useAtomSet(unsubscribeAtom, { mode: "promiseExit" })
  const toasts = Toast.useToastManager()
  const [asking, setAsking] = useState<"unsubscribe" | null>(null)
  const wide = useMinWidth("64rem")
  // Remembered on this Device, so a reload or the next podcast keeps it as left.
  const [showSettings, setShowSettingsState] = useState(subscriptionSettingsOpen.get)
  const setShowSettings = (open: boolean) => {
    subscriptionSettingsOpen.set(open)
    setShowSettingsState(open)
  }
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())

  if (AsyncResult.isInitial(result)) return <LoadingRows label="Loading Subscription" />
  if (subscription === null) {
    return (
      <>
        <PageHeader
          backOnDesktop
          title="Podcast not found"
          back={{ to: "/library", label: "Library" }}
        />
        <EmptyState title="This podcast isn’t in your Library">
          It may have been unsubscribed, or the link is wrong.{" "}
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
        backOnDesktop
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
      <div className="grid max-w-[1100px] gap-6 px-5 pb-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby={`${id}-settings`} className="lg:order-2">
          <div className="flex items-center gap-4">
            <Artwork url={subscription.artworkUrl} name={subscription.title} size={72} />
            {subscription.description && (
              <p className="line-clamp-4 text-small text-muted-foreground">
                {subscription.description}
              </p>
            )}
          </div>
          {wide ? (
            <h2
              id={`${id}-settings`}
              className="mt-5 pb-1.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
            >
              Settings for this podcast
            </h2>
          ) : (
            // Narrow: the Episodes lead; the settings fold away, their rule still in sight.
            <h2 id={`${id}-settings`} className="mt-4">
              <button
                type="button"
                aria-expanded={showSettings}
                aria-controls={`${id}-settings-card`}
                onClick={() => setShowSettings(!showSettings)}
                className="flex min-h-11 w-full items-center gap-2 rounded-xl px-1 text-left hover:bg-secondary/60"
              >
                <ChevronRight
                  aria-hidden="true"
                  className={`size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${showSettings ? "rotate-90" : ""}`}
                />
                <span className="text-row font-medium">Settings for this podcast</span>
                <span className="ml-auto text-small text-muted-foreground">
                  {rule.mode === "never"
                    ? "Streams"
                    : rule.mode === "onEntry"
                      ? "Downloads Entries"
                      : "Downloads every new Episode"}
                </span>
              </button>
            </h2>
          )}
          <div
            id={`${id}-settings-card`}
            hidden={!wide && !showSettings}
            className="rounded-xl border bg-card"
          >
            <SettingsRow
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
                className={fieldControl}
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
                  className={`${fieldControl} mt-2`}
                >
                  {[3, 5, 10, 20].map((n) => (
                    <option key={n} value={n}>
                      Keep the newest {n}
                    </option>
                  ))}
                  <option value="">Keep all new ones</option>
                </select>
              )}
            </SettingsRow>
            <SettingsRow
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
                className={fieldControl}
              >
                <option value="">Default (30 seconds)</option>
                {thresholds.map((s) => (
                  <option key={s} value={s}>
                    {s === 0 ? "At the very end" : `Last ${s} seconds`}
                  </option>
                ))}
              </select>
            </SettingsRow>
            <SettingsRow label="Speed" htmlFor={`${id}-speed`}>
              <select
                id={`${id}-speed`}
                value={overrides.speed === undefined ? "" : String(overrides.speed)}
                onChange={(event) =>
                  withOverride(
                    "speed",
                    event.target.value === "" ? undefined : Number(event.target.value)
                  )
                }
                className={fieldControl}
              >
                <option value="">Default</option>
                {speeds.map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            </SettingsRow>
            <SettingsRow label="Skip intro" htmlFor={`${id}-intro`}>
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
                className={fieldControl}
              >
                <option value="">Default</option>
                {skips.map((s) => (
                  <option key={s} value={s}>
                    {s === 0 ? "Off" : `${s} seconds`}
                  </option>
                ))}
              </select>
            </SettingsRow>
            <SettingsRow label="Skip outro" htmlFor={`${id}-outro`}>
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
                className={fieldControl}
              >
                <option value="">Default</option>
                {skips.map((s) => (
                  <option key={s} value={s}>
                    {s === 0 ? "Off" : `${s} seconds`}
                  </option>
                ))}
              </select>
            </SettingsRow>
            <SettingsRow label="Volume boost" htmlFor={`${id}-boost`}>
              <select
                id={`${id}-boost`}
                value={overrides.volumeBoost === undefined ? "" : String(overrides.volumeBoost)}
                onChange={(event) =>
                  withOverride(
                    "volumeBoost",
                    event.target.value === "" ? undefined : event.target.value === "true"
                  )
                }
                className={fieldControl}
              >
                <option value="">Default</option>
                <option value="true">On</option>
                <option value="false">Off</option>
              </select>
            </SettingsRow>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={subscription.unplayed === 0}
              onClick={() => void markAllPlayed()}
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
            <div className="-mx-5 md:-mx-8">
              <EpisodeList
                episodes={episodes}
                label={`${subscription.title} Episodes`}
                ready={!AsyncResult.isInitial(episodesResult)}
                onOpen={(episodeId) =>
                  void navigate({ to: "/episodes/$episodeId", params: { episodeId } })
                }
                checked={checked}
                setChecked={(update) => setChecked(update(checked))}
                showPodcast={false}
              />
            </div>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={asking === "unsubscribe"}
        onOpenChange={(open) => setAsking(open ? "unsubscribe" : null)}
        title={`Unsubscribe from ${subscription.title}?`}
        confirm="Unsubscribe"
        destructive
        onConfirm={async () => {
          const exit = await unsubscribe(subscriptionId)
          if (Exit.isFailure(exit)) return "Couldn’t unsubscribe. Check that you’re online."
          toasts.add({ description: `Unsubscribed from ${subscription.title}`, timeout: 4000 })
          await navigate({ to: "/library" })
          return null
        }}
      >
        Its Episodes leave your Library, except ones in a Playlist or Starred, which stay until you
        remove them. Downloads stay on your Devices.
      </ConfirmDialog>
    </>
  )
}
