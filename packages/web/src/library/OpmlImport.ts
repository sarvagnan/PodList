import { checkOpml, invalidOpml } from "./opmlFormat.ts"

export interface ImportPodcast {
  readonly feedUrl: string
  readonly title: string
  readonly result: "pending" | "added" | "already in the Library" | "failed"
  readonly reason?: string | undefined
}
export interface ImportState {
  readonly name: string
  readonly podcasts: ReadonlyArray<ImportPodcast>
  readonly phase: "empty" | "reading" | "ready" | "running" | "finished" | "error"
  readonly error?: string | undefined
}

export function readOpml(xml: string): ReadonlyArray<ImportPodcast> {
  checkOpml(xml)
  const doc = new DOMParser().parseFromString(xml, "application/xml")
  if (
    doc.querySelector("parsererror") ||
    doc.documentElement.tagName !== "opml" ||
    !doc.querySelector("opml > body")
  )
    throw invalidOpml()
  const seen = new Set<string>()
  return [...doc.querySelectorAll("body outline[xmlUrl]")].flatMap((outline) => {
    const feedUrl = outline.getAttribute("xmlUrl")?.trim()
    if (!feedUrl || seen.has(feedUrl)) return []
    seen.add(feedUrl)
    return [
      {
        feedUrl,
        title: outline.getAttribute("text") || outline.getAttribute("title") || feedUrl,
        result: "pending" as const
      }
    ]
  })
}

const reason = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Could not import this podcast. Check your connection and retry."

/** Owned by the app, independently of any sheet or route. No subscriptions during selection. */
export class OpmlImport {
  private state: ImportState = { name: "", podcasts: [], phase: "empty" }
  private generation = 0
  private listeners = new Set<() => void>()
  getSnapshot = () => this.state
  listen = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private update(state: ImportState) {
    this.state = state
    for (const listener of this.listeners) listener()
  }
  cancel() {
    if (this.state.phase !== "running") {
      this.generation++
      this.update({ name: "", podcasts: [], phase: "empty" })
    }
  }
  async select(
    file: Pick<File, "name" | "size" | "text">,
    known: () => Promise<ReadonlySet<string>>
  ) {
    await this.selectFiles([file], known)
  }
  async selectFiles(
    files: ReadonlyArray<Pick<File, "name" | "size" | "text">>,
    known: () => Promise<ReadonlySet<string>>,
    parse: (
      text: string
    ) => ReadonlyArray<ImportPodcast> | Promise<ReadonlyArray<ImportPodcast>> = readOpml
  ) {
    if (this.state.phase === "running" || !files.length) return
    const name = files.length === 1 ? (files[0]?.name ?? "") : `${files.length} OPML files`
    const generation = ++this.generation
    this.update({ name, podcasts: [], phase: "reading" })
    try {
      if (files.reduce((bytes, file) => bytes + file.size, 0) > 8 * 1024 * 1024)
        throw new Error("Choose OPML files totalling at most 8 MiB.")
      const podcasts = new Map<string, ImportPodcast>()
      for (const file of files) {
        for (const podcast of await parse(await file.text())) {
          if (!podcasts.has(podcast.feedUrl)) podcasts.set(podcast.feedUrl, podcast)
        }
      }
      const existing = await known()
      if (generation !== this.generation) return
      this.update({
        name,
        phase: "ready",
        podcasts: Array.from(podcasts.values(), (p) =>
          existing.has(p.feedUrl) ? { ...p, result: "already in the Library" } : p
        )
      })
    } catch (error) {
      if (generation === this.generation)
        this.update({ name, podcasts: [], phase: "error", error: reason(error) })
    }
  }
  async run(
    known: () => Promise<ReadonlySet<string>>,
    subscribe: (feed: string) => Promise<unknown>,
    retry = false,
    refresh?: () => Promise<unknown>
  ) {
    if (retry ? this.state.phase !== "finished" : this.state.phase !== "ready") return
    const targets = new Set(
      this.state.podcasts
        .filter((p) => (retry ? p.result === "failed" : true))
        .map((p) => p.feedUrl)
    )
    this.update({
      ...this.state,
      phase: "running",
      error: undefined,
      podcasts: this.state.podcasts.map((p) =>
        targets.has(p.feedUrl) ? { ...p, result: "pending", reason: undefined } : p
      )
    })
    // Installed for the whole job, even after the sheet and Library have unmounted.
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    const podcasts = [...this.state.podcasts]
    let progress: ReturnType<typeof setTimeout> | undefined
    const publishProgress = () => {
      clearTimeout(progress)
      progress = undefined
      this.update({ ...this.state, podcasts: [...podcasts] })
    }
    try {
      const existing = new Set(await known())
      for (const [index, podcast] of podcasts.entries()) {
        if (!targets.has(podcast.feedUrl)) continue
        let result: ImportPodcast
        if (existing.has(podcast.feedUrl)) result = { ...podcast, result: "already in the Library" }
        else {
          try {
            await subscribe(podcast.feedUrl)
            existing.add(podcast.feedUrl)
            result = { ...podcast, result: "added" }
          } catch (error) {
            result = { ...podcast, result: "failed", reason: reason(error) }
          }
        }
        podcasts[index] = result
        if (refresh) progress ??= setTimeout(publishProgress, 100)
        else publishProgress()
      }
      if (progress !== undefined) publishProgress()
      if (
        refresh &&
        podcasts.some((podcast) => podcast.result === "added" && targets.has(podcast.feedUrl))
      )
        await refresh().catch(() => {})
    } catch (error) {
      if (progress !== undefined) publishProgress()
      this.update({
        ...this.state,
        podcasts: podcasts.map((p) =>
          targets.has(p.feedUrl) ? { ...p, result: "failed", reason: reason(error) } : p
        )
      })
    } finally {
      window.removeEventListener("beforeunload", warn)
      this.update({ ...this.state, phase: "finished" })
    }
  }
}
export const opmlImport = new OpmlImport()
