import { Dialog } from "@base-ui/react/dialog"
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { useEffect, useRef } from "react"
import { bringOverCommandAtom, bringOverStatusAtom } from "../../app/bringOver.ts"
import { useLibraryReady } from "../../app/hooks.ts"
import { desktopStandalone } from "../../lib/desktopSession.ts"
import { formatTime } from "../../lib/time.ts"

const onMac = () => navigator.platform.includes("Mac")
const count = (n: number, singular: string, plural = `${singular}s`) =>
  `${n} ${n === 1 ? singular : plural}`
const secondary = "rounded-full bg-secondary px-4 py-2 text-row font-medium hover:bg-input"

export function BringOverSettings() {
  const status = useAtomValue(bringOverStatusAtom)
  const run = useAtomSet(bringOverCommandAtom)
  if (desktopStandalone) return null
  if (status.kind === "offer")
    return (
      <button type="button" className={secondary} onClick={() => run("show")}>
        Bring Library from This {onMac() ? "Mac" : "Computer"}…
      </button>
    )
  if (status.kind === "error")
    return (
      <div className="space-y-2">
        <p role="alert" className="text-row text-destructive">
          {status.message}
        </p>
        <button type="button" className={secondary} onClick={() => run("retry")}>
          Retry
        </button>
      </div>
    )
  if (status.kind === "pending")
    return (
      <p role="status" className="text-row">
        Bringing over: {status.progress.feeds} feeds transferred, {status.progress.downloads}{" "}
        downloads copied. Progress is saved.
      </p>
    )
  if (status.kind === "complete")
    return (
      <p role="status" className="text-row">
        Library brought over. The original Library is retained on this computer.
      </p>
    )
  return null
}

export function BringOverPrompt() {
  const ready = useLibraryReady()
  const status = useAtomValue(bringOverStatusAtom)
  const run = useAtomSet(bringOverCommandAtom)
  const cancel = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!ready || desktopStandalone) return
    run("inspect")
    const online = () => run("inspect")
    window.addEventListener("online", online)
    return () => window.removeEventListener("online", online)
  }, [ready, run])
  if (status.kind !== "offer") return null
  const counts = status.preview
  const fields = [
    ["Subscriptions", `${counts.addedSubscriptions} added · ${counts.mergedSubscriptions} merged`],
    ["Episodes", `${counts.addedEpisodes} added · ${counts.mergedEpisodes} matched`],
    ["Playlists", `${counts.playlists} added · Default merged`],
    [
      "Entries and Positions",
      `${count(counts.entries, "Entry", "Entries")} · ${count(counts.positions, "Position")}`
    ],
    ["Played and Starred", `${counts.played} Played · ${counts.starred} Starred`],
    ["Listening Log", formatTime(counts.listeningSeconds)],
    [
      "Views and Downloads",
      `${count(counts.views, "View")} · ${count(counts.downloads, "Download")}`
    ]
  ]
  return (
    <Dialog.Root
      open={status.open}
      onOpenChange={(open) => {
        if (!open) run("decline")
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup
          initialFocus={cancel}
          data-sheet="dialog"
          className="fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-[min(35rem,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-card p-5 shadow-xl"
        >
          <Dialog.Title className="font-heading text-xl font-semibold">
            Bring this {onMac() ? "Mac’s" : "computer’s"} Library over?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-row text-muted-foreground">
            To {status.address}
          </Dialog.Description>
          <dl className="my-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 text-row">
            {fields.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="font-medium">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-row">
            Podcasts match by feed address and Episodes by GUID. The Default Playlist merges with
            the server. Other Playlists and Views keep unique names. Downloads are kept as Manual
            Downloads.
          </p>
          <p className="mt-2 text-small text-muted-foreground">
            The original Library stays on this computer. Not Now keeps the Libraries separate, and
            you can return to this preview from Settings.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close ref={cancel} className={secondary}>
              Not Now
            </Dialog.Close>
            <button
              type="button"
              className="rounded-full bg-primary px-4 py-2 text-row font-medium text-primary-foreground hover:bg-primary/90"
              onClick={() => run("accept")}
            >
              Bring Over
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
