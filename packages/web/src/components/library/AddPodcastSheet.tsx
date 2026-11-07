import { Dialog } from "@base-ui/react/dialog"
import { Toast } from "@base-ui/react/toast"
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import type { Directory } from "@podlist/api"
import { Cause, Exit } from "effect"
import { AsyncResult } from "effect/reactivity"
import { Check, X } from "lucide-react"
import { type ReactNode, useEffect, useId, useState } from "react"
import { subscriptionsAtom } from "../../app/data.ts"
import { directorySearchAtom, importOpmlAtom, subscribeAtom } from "../../app/library.ts"
import { useBackLayers } from "../../lib/backLayers.ts"
import { wrapTab } from "../../lib/focusTrap.ts"
import { Artwork } from "../shell/Artwork.tsx"

// Add podcasts (docs/design/ui-layout.md › Library): Search through Podcast Index, a feed
// address resolved directly, or an OPML file from another app.

type Tab = "search" | "address" | "opml"

const messageOf = (exit: Exit.Exit<unknown, unknown>) =>
  Exit.isFailure(exit)
    ? (Cause.squash(exit.cause) as Error | undefined)?.message || "Something went wrong."
    : null

const looksLikeFeed = (text: string) => /^https?:\/\/\S+\.\S+/.test(text.trim())

function SubscribeButton({ feedUrl, title }: { readonly feedUrl: string; readonly title: string }) {
  const subscribed = AsyncResult.getOrElse(useAtomValue(subscriptionsAtom), () => []).some(
    (s) => s.feedUrl === feedUrl
  )
  const subscribe = useAtomSet(subscribeAtom, { mode: "promiseExit" })
  const toasts = Toast.useToastManager()
  const [busy, setBusy] = useState(false)
  if (subscribed) {
    return (
      <span className="inline-flex h-9 shrink-0 items-center gap-1 px-2 text-small font-medium text-muted-foreground">
        <Check aria-hidden="true" className="size-4" />
        Subscribed
      </span>
    )
  }
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={`Subscribe to ${title}`}
      onClick={async () => {
        setBusy(true)
        const problem = messageOf(await subscribe(feedUrl))
        setBusy(false)
        toasts.add({ description: problem ?? `Subscribed to ${title}`, timeout: 4000 })
      }}
      className="h-9 shrink-0 rounded-full bg-primary px-4 text-small font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
    >
      {busy ? "Subscribing…" : "Subscribe"}
    </button>
  )
}

function SearchTab() {
  const id = useId()
  const [text, setText] = useState("")
  const [results, setResults] = useState<ReadonlyArray<Directory.DirectoryResult> | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const search = useAtomSet(directorySearchAtom, { mode: "promiseExit" })
  useEffect(() => {
    const words = text.trim()
    if (words.length < 2 || looksLikeFeed(words)) {
      setResults(null)
      return
    }
    const timer = setTimeout(async () => {
      const exit = await search(words)
      setProblem(messageOf(exit))
      setResults(Exit.isSuccess(exit) ? exit.value : [])
    }, 400)
    return () => clearTimeout(timer)
  }, [text, search])
  return (
    <div>
      <label htmlFor={`${id}-q`} className="text-row font-medium">
        Podcast name, or a feed address
      </label>
      <input
        id={`${id}-q`}
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-row"
      />
      <div aria-live="polite" className="mt-3 max-h-[50dvh] overflow-y-auto">
        {looksLikeFeed(text) ? (
          <Result
            title={text.trim()}
            detail="Feed address"
            feedUrl={text.trim()}
            artworkUrl={null}
          />
        ) : problem ? (
          <p className="text-row text-destructive">{problem}</p>
        ) : results?.length === 0 ? (
          <p className="text-row text-muted-foreground">No podcasts found. Try other words.</p>
        ) : (
          results?.map((r) => (
            <Result
              key={r.feedUrl}
              title={r.title}
              detail={r.author ?? ""}
              feedUrl={r.feedUrl}
              artworkUrl={r.artworkUrl}
            />
          ))
        )}
      </div>
    </div>
  )
}

function Result({
  title,
  detail,
  feedUrl,
  artworkUrl
}: {
  readonly title: string
  readonly detail: string
  readonly feedUrl: string
  readonly artworkUrl: string | null
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 border-b py-2 last:border-b-0">
      <Artwork url={artworkUrl} name={title} size={44} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-row font-medium">{title}</span>
        {detail && (
          <span className="block truncate text-small text-muted-foreground">{detail}</span>
        )}
      </span>
      <SubscribeButton feedUrl={feedUrl} title={title} />
    </div>
  )
}

function AddressTab() {
  const id = useId()
  const [text, setText] = useState("")
  return (
    <div>
      <label htmlFor={`${id}-url`} className="text-row font-medium">
        Feed address
      </label>
      <input
        id={`${id}-url`}
        type="url"
        inputMode="url"
        value={text}
        placeholder="https://example.com/feed.xml"
        onChange={(event) => setText(event.target.value)}
        className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-row"
      />
      <p className="mt-1.5 text-small text-muted-foreground">
        Any podcast’s RSS address; no directory needed.
      </p>
      {looksLikeFeed(text) && (
        <div className="mt-3">
          <Result
            title={text.trim()}
            detail="Feed address"
            feedUrl={text.trim()}
            artworkUrl={null}
          />
        </div>
      )}
    </div>
  )
}

function OpmlTab() {
  const id = useId()
  const importOpml = useAtomSet(importOpmlAtom, { mode: "promiseExit" })
  const [summary, setSummary] = useState<ReactNode>(null)
  const [busy, setBusy] = useState(false)
  return (
    <div>
      <label htmlFor={`${id}-file`} className="text-row font-medium">
        OPML file
      </label>
      <p className="mt-0.5 text-small text-muted-foreground">
        Export it from your other podcast app; every podcast in it is subscribed.
      </p>
      <input
        id={`${id}-file`}
        type="file"
        accept=".opml,.xml,text/xml,text/x-opml,application/xml"
        disabled={busy}
        onChange={async (event) => {
          const file = event.target.files?.[0]
          if (file === undefined) return
          setBusy(true)
          setSummary("Importing…")
          const exit = await importOpml(await file.text())
          setBusy(false)
          if (Exit.isFailure(exit)) {
            setSummary(<span className="text-destructive">{messageOf(exit)}</span>)
            return
          }
          const { added, alreadySubscribed, failed } = exit.value
          setSummary(
            <>
              <span className="block">
                Added {added}
                {alreadySubscribed > 0 ? `; ${alreadySubscribed} already subscribed` : ""}.
              </span>
              {failed.length > 0 && (
                <span className="mt-1 block text-destructive">
                  {failed.length} couldn’t be read: {failed.map((f) => f.feedUrl).join(", ")}
                </span>
              )}
            </>
          )
        }}
        className="mt-2 block w-full text-row file:mr-3 file:h-10 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:font-medium"
      />
      <p aria-live="polite" className="mt-3 text-row">
        {summary}
      </p>
    </div>
  )
}

export function AddPodcastSheet({
  open,
  onOpenChange
}: {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}) {
  const [tab, setTab] = useState<Tab>("search")
  useBackLayers(open ? 1 : 0, () => onOpenChange(false))
  const tabs: ReadonlyArray<readonly [Tab, string]> = [
    ["search", "Search"],
    ["address", "Feed address"],
    ["opml", "OPML file"]
  ]
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          data-sheet="dialog"
          onKeyDown={wrapTab}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-card px-5 pt-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-xl transition-transform data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full md:inset-auto md:top-1/2 md:left-1/2 md:w-[min(32rem,calc(100vw-32px))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:data-[ending-style]:translate-y-[-45%] md:data-[ending-style]:opacity-0 md:data-[starting-style]:translate-y-[-45%] md:data-[starting-style]:opacity-0"
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-heading text-xl font-semibold">Add podcasts</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="-mt-1 -mr-2 grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary active:bg-input"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>
          <fieldset className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-secondary p-1">
            <legend className="sr-only">How to add</legend>
            {tabs.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
                className="h-9 rounded-full text-small font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
              >
                {label}
              </button>
            ))}
          </fieldset>
          <div className="mt-4">
            {tab === "search" ? <SearchTab /> : tab === "address" ? <AddressTab /> : <OpmlTab />}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
