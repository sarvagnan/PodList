import { useAtomSet } from "@effect/atom-react"
import { Operation, PlaybackSettings, State } from "@podlist/domain"
import { createFileRoute } from "@tanstack/react-router"
import { Schema } from "effect"
import { type ReactNode, useId } from "react"
import { useAppState } from "../app/hooks.ts"
import { recordAtom } from "../app/runtime.ts"
import { LoadingRows } from "../components/lists/ListRow.tsx"
import { PageHeader } from "../components/shell/PageHeader.tsx"

// Settings (CONTEXT.md › Playback Settings, Trash): the global Playback Settings, which a
// podcast's own settings can override, and how long the Trash keeps deleted Playlists.
// Changing speed in the player affects only the Episode playing; this is where it sticks.

export const Route = createFileRoute("/settings")({ component: SettingsScreen })

const change = Schema.decodeUnknownSync(Operation.Change)
const speeds = [0.8, 1, 1.2, 1.5, 1.75, 2, 2.5, 3]
const skips = [0, 15, 30, 45, 60, 90, 120]
const trashDays = [7, 14, 30, 60, 90]
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
    <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2.5 last:border-b-0">
      <label htmlFor={htmlFor} className="min-w-40 flex-1 text-row font-medium">
        {label}
        {help && <span className="block text-small font-normal text-muted-foreground">{help}</span>}
      </label>
      <div className="w-full sm:w-56">{children}</div>
    </div>
  )
}

function SettingsScreen() {
  const state = useAppState()
  const record = useAtomSet(recordAtom)
  const id = useId()
  if (state === null) return <LoadingRows label="Loading settings" />
  const settings = state.playbackSettings
  const set = (patch: Partial<PlaybackSettings.PlaybackSettings>) =>
    record(
      change({
        _tag: "SetPlaybackSettings",
        settings: Schema.encodeSync(PlaybackSettings.PlaybackSettings)(
          new PlaybackSettings.PlaybackSettings({ ...settings, ...patch })
        )
      })
    )
  const heading =
    "px-1 pb-1.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-xl space-y-6 px-4 pb-10 md:px-8">
        <section aria-labelledby={`${id}-playback`}>
          <h2 id={`${id}-playback`} className={heading}>
            Playback
          </h2>
          <div className="rounded-xl border bg-card">
            <Row label="Speed" htmlFor={`${id}-speed`} help="A podcast’s own speed comes first">
              <select
                id={`${id}-speed`}
                value={String(settings.speed)}
                onChange={(event) => set({ speed: Number(event.target.value) })}
                className={control}
              >
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
                value={String(settings.skipIntro)}
                onChange={(event) =>
                  set({
                    skipIntro: Number(
                      event.target.value
                    ) as PlaybackSettings.PlaybackSettings["skipIntro"]
                  })
                }
                className={control}
              >
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
                value={String(settings.skipOutro)}
                onChange={(event) =>
                  set({
                    skipOutro: Number(
                      event.target.value
                    ) as PlaybackSettings.PlaybackSettings["skipOutro"]
                  })
                }
                className={control}
              >
                {skips.map((s) => (
                  <option key={s} value={s}>
                    {s === 0 ? "Off" : `${s} seconds`}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Volume boost" htmlFor={`${id}-boost`} help="Evens out quiet voices">
              <select
                id={`${id}-boost`}
                value={String(settings.volumeBoost)}
                onChange={(event) => set({ volumeBoost: event.target.value === "true" })}
                className={control}
              >
                <option value="false">Off</option>
                <option value="true">On</option>
              </select>
            </Row>
          </div>
        </section>
        <section aria-labelledby={`${id}-trash`}>
          <h2 id={`${id}-trash`} className={heading}>
            Trash
          </h2>
          <div className="rounded-xl border bg-card">
            <Row label="Keep deleted Playlists" htmlFor={`${id}-days`}>
              <select
                id={`${id}-days`}
                value={String(State.trashDaysOf(state))}
                onChange={(event) =>
                  record(change({ _tag: "SetTrashDays", days: Number(event.target.value) }))
                }
                className={control}
              >
                {trashDays.map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </select>
            </Row>
          </div>
        </section>
      </div>
    </>
  )
}
