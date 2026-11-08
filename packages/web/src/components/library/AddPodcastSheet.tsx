import { Dialog } from "@base-ui/react/dialog"
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import type { Directory } from "@podlist/api"
import { Cause, Exit } from "effect"
import { AsyncResult } from "effect/reactivity"
import { Check, X } from "lucide-react"
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState
} from "react"
import { subscriptionsAtom } from "../../app/data.ts"
import { directorySearchAtom, importOpmlAtom, subscribeAtom } from "../../app/library.ts"
import { useBackLayers } from "../../lib/backLayers.ts"
import { serverNeeded } from "../../lib/connectionMessage.ts"
import { useDialogDraft } from "../../lib/dialogDraft.ts"
import { wrapTab } from "../../lib/focusTrap.ts"
import { Artwork } from "../shell/Artwork.tsx"

// Add podcasts (docs/design/ui-layout.md › Library): Search through Podcast Index, a feed
// address resolved directly, or an OPML file from another app.

type Tab = "search" | "address" | "opml"
const DraftSaved = createContext(() => {})

const messageOf = (exit: Exit.Exit<unknown, unknown>) =>
  Exit.isFailure(exit)
    ? (Cause.squash(exit.cause) as Error | undefined)?.message || serverNeeded
    : null

const looksLikeFeed = (text: string) => /^https?:\/\/\S+\.\S+/.test(text.trim())

function SubscribeButton({
  feedUrl,
  title,
  onProblem
}: {
  readonly feedUrl: string
  readonly title: string
  /** Says what went wrong next to the podcast, not in a passing toast (COPY-02). */
  readonly onProblem: (problem: string | null) => void
}) {
  const subscribed = AsyncResult.getOrElse(useAtomValue(subscriptionsAtom), () => []).some(
    (s) => s.feedUrl === feedUrl
  )
  const saved = useContext(DraftSaved)
  const subscribe = useAtomSet(subscribeAtom, { mode: "promiseExit" })
  const [busy, setBusy] = useState(false)
  // The button gives way to "Subscribed"; focus goes with it rather than to the page.
  const focusNext = useRef(false)
  if (subscribed) {
    return (
      <span
        tabIndex={-1}
        ref={(el) => {
          if (el && focusNext.current) {
            focusNext.current = false
            el.focus()
          }
        }}
        className="inline-flex h-10 shrink-0 items-center gap-1 px-2 text-small font-medium text-muted-foreground outline-offset-2"
      >
        <Check aria-hidden="true" className="size-4" />
        Subscribed
      </span>
    )
  }
  return (
    <button
      type="button"
      // Busy without `disabled`, which would push focus out of the sheet (WKEY-03).
      data-subscribe=""
      aria-disabled={busy}
      aria-label={`Subscribe to ${title}`}
      onClick={async () => {
        if (busy) return
        setBusy(true)
        onProblem(null)
        const exit = await subscribe(feedUrl)
        const problem = messageOf(exit)
        setBusy(false)
        if (problem === null) {
          saved()
          focusNext.current = true
          // Named as the feed calls itself, not by the address typed (a URL).
          // Said once, where it happened: the button becomes "Subscribed" and takes focus.
        } else onProblem(problem)
      }}
      className="h-10 shrink-0 rounded-full bg-primary px-4 text-row font-semibold text-primary-foreground hover:bg-primary/90 aria-disabled:opacity-60"
    >
      {busy ? "Subscribing…" : "Subscribe"}
    </button>
  )
}

function SearchTab({
  text,
  setText
}: {
  readonly text: string
  readonly setText: (text: string) => void
}) {
  const id = useId()
  const [results, setResults] = useState<ReadonlyArray<Directory.DirectoryResult> | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [settled, setSettled] = useState("")
  const search = useAtomSet(directorySearchAtom, { mode: "promiseExit" })
  useEffect(() => {
    const words = text.trim()
    setSettled("")
    setProblem(null)
    if (words.length < 2 || looksLikeFeed(words)) {
      setResults(null)
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      const exit = await search(words)
      if (cancelled) return
      setProblem(messageOf(exit))
      setResults(Exit.isSuccess(exit) ? exit.value : [])
      setSettled(text)
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [text, search])
  // A pasted feed address that isn't one, said where every error in this sheet goes: under
  // the field, in place of its hint.
  const [feedProblem, setFeedProblem] = useState<string | null>(null)
  const searching = text.trim().length >= 2 && !looksLikeFeed(text) && settled !== text
  const error = looksLikeFeed(text)
    ? // Already in Search: the way out is a name, typed here.
      (feedProblem?.replace("find the podcast by name with Search", "type the podcast’s name") ??
      null)
    : searching
      ? null
      : problem
  return (
    <div>
      <label htmlFor={`${id}-q`} className="text-row font-medium">
        Podcast name
      </label>
      <input
        id={`${id}-q`}
        data-add-field=""
        type="search"
        value={text}
        aria-invalid={error !== null}
        aria-describedby={`${id}-help`}
        onChange={(event) => setText(event.target.value)}
        className="mt-1.5 min-h-11 w-full rounded-lg border border-field bg-card px-3 py-2 text-row aria-invalid:border-destructive"
      />
      <p
        id={`${id}-help`}
        className={`mt-1.5 text-small ${error ? "text-destructive" : "text-muted-foreground"}`}
      >
        {error ? (
          <span role="alert">{error}</span>
        ) : (
          "Finds it in the podcast directory. A feed address works here too."
        )}
      </p>
      {/* The status occupies a reserved line, so waiting never moves the results (CTRL-08). */}
      <p role="status" className="mt-2 min-h-[1.5rem] text-row text-muted-foreground">
        {searching ? "Searching…" : ""}
      </p>
      <div aria-live="polite" className="mt-3 max-h-[50dvh] min-h-24 overflow-y-auto">
        {looksLikeFeed(text) ? (
          <FeedPreview url={text.trim()} onProblem={setFeedProblem} />
        ) : problem ? null : results?.length === 0 ? (
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
  const [problem, setProblem] = useState<string | null>(null)
  return (
    <div className="border-b py-2 last:border-b-0">
      <div className="flex min-h-14 items-center gap-3">
        <Artwork url={artworkUrl} name={title} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-row font-medium">{title}</span>
          {detail && (
            <span className="block truncate text-small text-muted-foreground">{detail}</span>
          )}
        </span>
        <SubscribeButton feedUrl={feedUrl} title={title} onProblem={setProblem} />
      </div>
      {problem && (
        <p role="alert" className="mt-1 text-small text-destructive">
          {problem} Check the address, or find the podcast by name with Search.
        </p>
      )}
    </div>
  )
}

/**
 * A feed address, read before it's offered: the podcast it names (its own title and
 * artwork), or why it can't be subscribed to, under the field before any click.
 */
function FeedPreview({
  url,
  onProblem
}: {
  readonly url: string
  /** Told why the address can't be subscribed to (or null), so the field says it under
   * itself, in the one place its errors go. */
  readonly onProblem: (problem: string | null) => void
}) {
  const search = useAtomSet(directorySearchAtom, { mode: "promiseExit" })
  const [found, setFound] = useState<{
    readonly url: string
    readonly result: Directory.DirectoryResult | null | "offline"
  } | null>(null)
  useEffect(() => {
    const timer = setTimeout(async () => {
      const exit = await search(url)
      setFound({
        url,
        result: Exit.isFailure(exit) ? "offline" : (exit.value[0] ?? null)
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [url, search])
  const current = found?.url === url ? found.result : undefined
  const problem =
    current === "offline"
      ? serverNeeded
      : current === null
        ? "This address didn’t give a podcast feed. Check it, or find the podcast by name with Search."
        : null
  useEffect(() => onProblem(problem), [problem, onProblem])
  return (
    <div data-feed-preview="">
      {current === undefined ? (
        <p className="py-2 text-row text-muted-foreground">Checking the address…</p>
      ) : current === null || current === "offline" ? null : (
        <Result
          title={current.title}
          detail={current.author ?? "Feed address"}
          feedUrl={current.feedUrl}
          artworkUrl={current.artworkUrl}
        />
      )}
    </div>
  )
}

function AddressTab({
  text,
  setText
}: {
  readonly text: string
  readonly setText: (text: string) => void
}) {
  const id = useId()
  // Choosing this tab puts you in its field, as opening the sheet does in Search's.
  const field = useRef<HTMLInputElement>(null)
  useEffect(() => field.current?.focus(), [])
  // Judged once you've finished typing (leaving the field, or Enter), never mid-address:
  // "http" is the start of a good one (CTRL-04). Once shown, it clears as soon as it's right.
  const [checked, setChecked] = useState(false)
  const [notAFeed, setNotAFeed] = useState<string | null>(null)
  // Not an address yet (once you've finished typing), or an address that isn't a feed: said
  // in one place, under the field in place of its hint.
  const error =
    checked && text.trim().length > 0 && !looksLikeFeed(text)
      ? "Enter the whole address, starting with https://"
      : looksLikeFeed(text)
        ? notAFeed
        : null
  const invalid = error !== null
  return (
    <div>
      <label htmlFor={`${id}-url`} className="text-row font-medium">
        Feed address
      </label>
      <input
        ref={field}
        id={`${id}-url`}
        type="url"
        inputMode="url"
        value={text}
        placeholder="https://example.com/feed.xml"
        aria-invalid={invalid}
        aria-describedby={`${id}-help`}
        onChange={(event) => setText(event.target.value)}
        // Enter subscribes, once the address has been found to be a podcast.
        onBlur={() => setChecked(true)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          setChecked(true)
          document.querySelector<HTMLButtonElement>("[data-feed-preview] [data-subscribe]")?.click()
        }}
        className="mt-1.5 min-h-11 w-full rounded-lg border border-field bg-card px-3 py-2 text-row aria-invalid:border-destructive"
      />
      {/* Says at once what's wrong with an address, as it's typed (WDATA-03). */}
      <p
        id={`${id}-help`}
        className={`mt-1.5 text-small ${error ? "text-destructive" : "text-muted-foreground"}`}
      >
        {error ? (
          <span role="alert">{error}</span>
        ) : (
          "Any podcast’s RSS address; no directory needed."
        )}
      </p>
      {looksLikeFeed(text) && (
        <div className="mt-3">
          <FeedPreview url={text.trim()} onProblem={setNotAFeed} />
        </div>
      )}
    </div>
  )
}

function OpmlTab() {
  const id = useId()
  const saved = useContext(DraftSaved)
  const importOpml = useAtomSet(importOpmlAtom, { mode: "promiseExit" })
  const [summary, setSummary] = useState<ReactNode>(null)
  const [busy, setBusy] = useState(false)
  // A file held over the drop area (DRAG-01).
  const [over, setOver] = useState(false)
  const importFile = async (file: File) => {
    setBusy(true)
    setSummary("Importing…")
    const exit = await importOpml(await file.text())
    setBusy(false)
    if (Exit.isFailure(exit)) {
      setSummary(<span className="text-destructive">{messageOf(exit)}</span>)
      return
    }
    saved()
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
  }
  const holdsFile = (event: React.DragEvent) => event.dataTransfer.types.includes("Files")
  return (
    <div>
      <label htmlFor={`${id}-file`} className="text-row font-medium">
        OPML file
      </label>
      <p className="mt-0.5 text-small text-muted-foreground">
        Export it from your other podcast app; every podcast in it is subscribed.
      </p>
      {/* Drop the file here, or choose it: the area takes a file dragged from the Finder or
          the desktop, and shows it will. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only drop area; the file field inside it is the keyboard's way in. */}
      <div
        data-file-drop=""
        onDragEnter={(event) => {
          if (holdsFile(event)) setOver(true)
        }}
        onDragOver={(event) => {
          if (!holdsFile(event)) return
          event.preventDefault()
          event.dataTransfer.dropEffect = busy ? "none" : "copy"
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setOver(false)
          const file = event.dataTransfer.files[0]
          if (file !== undefined && !busy) void importFile(file)
        }}
        className={`mt-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors motion-reduce:transition-none ${over ? "border-primary bg-accent" : "border-input"}`}
      >
        <p className="text-row font-medium">{over ? "Drop to import" : "Drop an OPML file here"}</p>
        <p className="mt-0.5 text-small text-muted-foreground">or</p>
        <input
          id={`${id}-file`}
          type="file"
          accept=".opml,.xml,text/xml,text/x-opml,application/xml"
          aria-disabled={busy}
          onClick={(event) => {
            if (busy) event.preventDefault()
          }}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file !== undefined) void importFile(file)
          }}
          className="mx-auto mt-2 block max-w-full text-row file:mr-3 file:h-10 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:font-medium"
        />
      </div>
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
  const { draft, update, clear } = useDialogDraft({
    kind: "podcasts",
    tab: "search",
    search: "",
    address: ""
  })
  const { tab } = draft
  const close = (next: boolean) => {
    if (!next) clear()
    onOpenChange(next)
  }
  useBackLayers(open ? 1 : 0, () => close(false))
  // Closing returns focus to what opened the sheet, or to the heading if that is gone
  // (the first-run card goes once there is a Subscription).
  const opener = useRef<Element | null>(null)
  if (open && opener.current === null) opener.current = document.activeElement
  const tabs: ReadonlyArray<readonly [Tab, string]> = [
    ["search", "Search"],
    ["address", "Feed address"],
    ["opml", "OPML file"]
  ]
  return (
    <DraftSaved value={clear}>
      <Dialog.Root open={open} onOpenChange={close}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup
            data-sheet="dialog"
            onKeyDown={wrapTab}
            // Opens on the search field, not the close button (KEY-04).
            initialFocus={() => document.querySelector<HTMLElement>("[data-add-field]")}
            finalFocus={() => {
              const back = opener.current
              return back instanceof HTMLElement && back.isConnected && back !== document.body
                ? back
                : document.querySelector<HTMLElement>("main h1")
            }}
            // Its height doesn't follow the results, so the field stays put as you type: a tall
            // sheet on the phone, hung from the top on wider screens.
            className="fixed inset-x-0 bottom-0 z-50 h-[min(44rem,85dvh)] overflow-y-auto rounded-t-2xl bg-card px-5 pt-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-xl transition-transform data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full md:inset-auto md:top-[max(2rem,12dvh)] md:h-auto md:left-1/2 md:max-h-[calc(100dvh-max(2rem,12dvh)-2rem)] md:w-[min(32rem,calc(100vw-32px))] md:-translate-x-1/2 md:rounded-2xl md:data-[ending-style]:translate-y-2 md:data-[ending-style]:opacity-0 md:data-[starting-style]:translate-y-2 md:data-[starting-style]:opacity-0"
          >
            <div className="flex items-start justify-between gap-4">
              <Dialog.Title className="font-heading text-xl font-semibold">
                Add podcasts
              </Dialog.Title>
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
                  onClick={() => update({ tab: value })}
                  className="h-9 rounded-full text-small font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:font-semibold aria-pressed:text-foreground aria-pressed:shadow-sm aria-pressed:ring-1 aria-pressed:ring-field/40"
                >
                  {label}
                </button>
              ))}
            </fieldset>
            <div className="mt-4">
              {tab === "search" ? (
                <SearchTab text={draft.search} setText={(search) => update({ search })} />
              ) : tab === "address" ? (
                <AddressTab text={draft.address} setText={(address) => update({ address })} />
              ) : (
                <OpmlTab />
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </DraftSaved>
  )
}
