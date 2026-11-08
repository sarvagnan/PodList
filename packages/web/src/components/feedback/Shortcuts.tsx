import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { useBackLayers } from "../../lib/backLayers.ts"
import { wrapTab } from "../../lib/focusTrap.ts"

// The keyboard shortcuts reference (KEY-08): opens on Cmd/Ctrl-/, from the sidebar, and
// from Help in the Mac app, all through one event. A modifier, so it can't fire while
// typing or by accident (WKEY-02).

export const openShortcuts = () => document.dispatchEvent(new CustomEvent("podlist:shortcuts"))

const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
const macApp = typeof navigator !== "undefined" && navigator.userAgent.includes("Electron")
const cmd = mac ? "⌘" : "Ctrl+"

const groups: ReadonlyArray<{
  readonly title: string
  readonly keys: ReadonlyArray<readonly [string, string]>
}> = [
  {
    title: "Outside fields and controls",
    keys: [
      ["Space", "Play or pause, including in Now Playing"],
      // ⌘K on a Mac only: elsewhere Ctrl+K belongs to the browser (BROWSER-05).
      [mac ? "/ or ⌘K" : "/", "Search the Library"],
      [`${cmd}Z`, "Undo the last change"],
      [mac ? "⇧⌘Z" : "Ctrl+Shift+Z", "Redo it"],
      ["Esc", "Close a sheet or panel; clear the selection"],
      [`${cmd}/`, "Show these shortcuts"]
    ]
  },
  {
    title: "In a View’s Episode list",
    keys: [
      ["↑ ↓", "Previous or next Episode"],
      ["← →", "Move between an Episode’s actions"],
      ["Home End", `First or last action (${cmd}Home, ${cmd}End: first or last Episode)`],
      ["PgUp PgDn", "Ten Episodes up or down"],
      ["Enter", "Open the Episode"],
      ["Space", "Select the Episode for bulk actions"],
      ["Shift ↑ ↓", "Select a run of Episodes"],
      [`${cmd}A`, "Select every Episode"],
      [`${cmd}C`, "Copy the ticked Episodes’ links, or the focused Episode’s link"],
      ["Letters", "Jump to a title"]
    ]
  },
  // Name the two Entry lists and their distinct reorder controls (KEY-08, WCOPY-01).
  {
    title: "In a Playlist or Up next",
    keys: [
      ["↑ ↓", "Previous or next Entry"],
      ["← →", "Move between an Entry’s actions"],
      ["Home End", `First or last action (${cmd}Home, ${cmd}End: first or last Entry)`],
      ["PgUp PgDn", "Ten Entries up or down"],
      ["Letters", "Jump to a title"],
      [`${cmd}C`, "Copy the focused Entry’s Episode link"],
      [
        "Delete Backspace",
        "Remove the focused Entry; Undo brings it back (Up next: upcoming Entries)"
      ],
      ["Space, ↑ ↓, Space", "Pick up, move and drop a Playlist reorder handle"],
      ["↑ ↓ on a handle", "Move an Up next Entry one place"]
    ]
  },
  ...(macApp
    ? [
        {
          title: "Mac app",
          keys: [
            ["⌘1 ⌘2 ⌘3", "Views, Playlists or Library"],
            ["⌘N", "New Playlist"],
            ["⇧⌘N", "New View"],
            ["⇧⌘A", "Add podcasts"],
            ["⌘[ ⌘]", "Back or forward"],
            ["⌘← ⌘→", "Back 15 or forward 30 seconds"],
            ["⌥⌘← ⌥⌘→", "Previous or next Chapter"],
            ["⌘W", "Close the window"]
          ] as const
        }
      ]
    : [])
]

const typing = (el: Element | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLInputElement && !["checkbox", "radio", "range", "button"].includes(el.type)))

export function Shortcuts() {
  const [open, setOpen] = useState(false)
  useBackLayers(open ? 1 : 0, () => setOpen(false))
  useEffect(() => {
    const show = () => setOpen(true)
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        (event.metaKey || event.ctrlKey) &&
        !typing(document.activeElement)
      ) {
        event.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("podlist:shortcuts", show)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("podlist:shortcuts", show)
      document.removeEventListener("keydown", onKey)
    }
  }, [])
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          data-sheet="dialog"
          onKeyDown={wrapTab}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-card px-5 pt-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-xl transition-transform data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full md:inset-auto md:top-1/2 md:left-1/2 md:w-[min(32rem,calc(100vw-32px))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:data-[ending-style]:translate-y-[-45%] md:data-[ending-style]:opacity-0 md:data-[starting-style]:translate-y-[-45%] md:data-[starting-style]:opacity-0"
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-heading text-xl font-semibold">
              Keyboard shortcuts
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="-mt-1 -mr-2 grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary active:bg-input"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>
          {groups.map((group) => (
            <section key={group.title} className="mt-4">
              <h3 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {group.title}
              </h3>
              <dl className="mt-1">
                {group.keys.map(([keys, what]) => (
                  <div
                    key={keys}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b py-2 last:border-b-0"
                  >
                    <dt className="w-36 shrink-0">
                      {keys.split(" ").map((k) => (
                        <kbd
                          key={k}
                          className="mr-1 inline-block rounded border border-input bg-background px-1.5 py-0.5 font-sans text-xs font-semibold"
                        >
                          {k}
                        </kbd>
                      ))}
                    </dt>
                    <dd className="min-w-0 flex-1 basis-40 text-row">{what}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
