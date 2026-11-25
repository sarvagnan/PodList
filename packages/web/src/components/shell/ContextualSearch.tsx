import { useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { Search, X } from "lucide-react"
import { useRef, useState } from "react"
import { contextualEpisodesAtom } from "../../app/data.ts"
import { desktopBuild } from "./DesktopPanes.tsx"

export function useListSearch(key: string, enabled = true) {
  const [saved, setSaved] = useState({ key, value: "" })
  return {
    text: desktopBuild && enabled && saved.key === key ? saved.value : "",
    setText: (value: string) => setSaved({ key, value })
  }
}

export function useEpisodeListSearch(key: string, enabled = true) {
  const search = useListSearch(key, enabled)
  const query = search.text.trim()
  const result = useAtomValue(contextualEpisodesAtom(query))
  return {
    ...search,
    query,
    waiting: Boolean(query) && (AsyncResult.isInitial(result) || AsyncResult.isWaiting(result)),
    matches: AsyncResult.getOrElse(result, () => new Set<string>())
  }
}

export function ContextualSearch({
  scope = "This list",
  text,
  setText
}: {
  readonly scope?: "This list" | "Episodes"
  readonly text: string
  readonly setText: (text: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  if (!desktopBuild) return null
  const clear = () => {
    setText("")
    input.current?.focus()
  }
  return (
    <div className="flex h-10 w-60 min-w-40 shrink-0 items-center gap-2 rounded-lg border border-field bg-card px-2 focus-within:ring-2 focus-within:ring-primary">
      <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span aria-hidden="true" className="shrink-0 border-r pr-2 text-small text-muted-foreground">
        {scope}
      </span>
      <input
        ref={input}
        type="search"
        data-context-search=""
        aria-label={scope === "Episodes" ? "Search Episodes" : "Search this list"}
        placeholder="Search"
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !text) return
          event.preventDefault()
          event.stopPropagation()
          clear()
        }}
        className="w-full min-w-0 outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear Search"
          onClick={clear}
          className="grid size-6 shrink-0 place-items-center rounded hover:bg-secondary"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  )
}
