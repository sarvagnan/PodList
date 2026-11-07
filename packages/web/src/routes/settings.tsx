import { useAtomSet } from "@effect/atom-react"
import { Operation, PlaybackSettings, State } from "@podlist/domain"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Schema } from "effect"
import { useId, useState } from "react"
import { useAppState } from "../app/hooks.ts"
import { recordAtom } from "../app/runtime.ts"
import { LoadingRows } from "../components/lists/ListRow.tsx"
import { fieldControl, SettingsRow } from "../components/lists/SettingsRow.tsx"
import { showGettingStarted } from "../components/shell/FirstRun.tsx"
import { PageHeader } from "../components/shell/PageHeader.tsx"
import { singleKeyShortcuts } from "../lib/remembered.ts"

// Settings (CONTEXT.md › Playback Settings, Trash): the global Playback Settings, which a
// podcast's own settings can override, and how long the Trash keeps deleted Playlists.
// Changing speed in the player affects only the Episode playing; this is where it sticks.

export const Route = createFileRoute("/settings")({ component: SettingsScreen })

const change = Schema.decodeUnknownSync(Operation.Change)
const speeds = [0.8, 1, 1.2, 1.5, 1.75, 2, 2.5, 3]
const skips = [0, 15, 30, 45, 60, 90, 120]
const trashDays = [7, 14, 30, 60, 90]

function SettingsScreen() {
  const state = useAppState()
  const record = useAtomSet(recordAtom)
  const id = useId()
  const navigate = useNavigate()
  const [singleKeys, setSingleKeys] = useState(singleKeyShortcuts.get)
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
  const heading = "pb-1.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
  return (
    <>
      {/* On the phone Settings opens from the Library's header, so it leads back there. */}
      <PageHeader title="Settings" back={{ to: "/library", label: "Library" }} />
      <div className="max-w-[704px] space-y-6 px-5 pb-10 md:px-8">
        <section aria-labelledby={`${id}-playback`}>
          <h2 id={`${id}-playback`} className={heading}>
            Playback
          </h2>
          <div className="rounded-xl border bg-card">
            <SettingsRow
              label="Speed"
              htmlFor={`${id}-speed`}
              help="A podcast’s own speed comes first"
            >
              <select
                id={`${id}-speed`}
                value={String(settings.speed)}
                onChange={(event) => set({ speed: Number(event.target.value) })}
                className={fieldControl}
              >
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
                value={String(settings.skipIntro)}
                onChange={(event) =>
                  set({
                    skipIntro: Number(
                      event.target.value
                    ) as PlaybackSettings.PlaybackSettings["skipIntro"]
                  })
                }
                className={fieldControl}
              >
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
                value={String(settings.skipOutro)}
                onChange={(event) =>
                  set({
                    skipOutro: Number(
                      event.target.value
                    ) as PlaybackSettings.PlaybackSettings["skipOutro"]
                  })
                }
                className={fieldControl}
              >
                {skips.map((s) => (
                  <option key={s} value={s}>
                    {s === 0 ? "Off" : `${s} seconds`}
                  </option>
                ))}
              </select>
            </SettingsRow>
            <SettingsRow label="Volume boost" htmlFor={`${id}-boost`} help="Evens out quiet voices">
              <select
                id={`${id}-boost`}
                value={String(settings.volumeBoost)}
                onChange={(event) => set({ volumeBoost: event.target.value === "true" })}
                className={fieldControl}
              >
                <option value="false">Off</option>
                <option value="true">On</option>
              </select>
            </SettingsRow>
          </div>
        </section>
        <section aria-labelledby={`${id}-trash`}>
          <h2 id={`${id}-trash`} className={heading}>
            Trash
          </h2>
          <div className="rounded-xl border bg-card">
            <SettingsRow label="Keep deleted Playlists" htmlFor={`${id}-days`}>
              <select
                id={`${id}-days`}
                value={String(State.trashDaysOf(state))}
                onChange={(event) =>
                  record(change({ _tag: "SetTrashDays", days: Number(event.target.value) }))
                }
                className={fieldControl}
              >
                {trashDays.map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </select>
            </SettingsRow>
          </div>
        </section>
        <section aria-labelledby={`${id}-keyboard`}>
          <h2 id={`${id}-keyboard`} className={heading}>
            Keyboard
          </h2>
          <div className="rounded-xl border bg-card">
            <label className="flex min-h-14 items-start gap-3 px-4 py-2.5">
              <input
                type="checkbox"
                checked={singleKeys}
                onChange={(event) => {
                  singleKeyShortcuts.set(event.target.checked)
                  setSingleKeys(event.target.checked)
                }}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                <span className="block text-row font-medium">Single-key shortcuts</span>
                <span className="block text-small text-muted-foreground">
                  / opens Search and Space plays or pauses, outside text fields. On this Device.
                </span>
              </span>
            </label>
          </div>
        </section>
        <section aria-labelledby={`${id}-help`}>
          <h2 id={`${id}-help`} className={heading}>
            Help
          </h2>
          <div className="rounded-xl border bg-card">
            <SettingsRow
              label="Getting started"
              htmlFor={`${id}-start`}
              help="What Views and Playlists are for, and adding podcasts"
            >
              <button
                id={`${id}-start`}
                type="button"
                aria-label="Show getting started"
                onClick={() => showGettingStarted((to) => navigate({ to }))}
                className="h-10 w-full rounded-full bg-secondary px-4 text-row font-medium hover:bg-input active:bg-input/70"
              >
                Show getting started
              </button>
            </SettingsRow>
          </div>
        </section>
      </div>
    </>
  )
}
