import { Context, Data, Effect, Layer } from "effect"

// The DownloadStore seam (ADR 0007): offline audio, per Device. The web implementation
// keeps one file per Episode in OPFS (the app's private storage); a native shell uses
// the system's background download service instead.

export class DownloadError extends Data.TaggedError("DownloadError")<{
  readonly episodeId: string
  readonly message: string
}> {}

export interface StoredDownload {
  readonly episodeId: string
  readonly bytes: number
}

export class DownloadStore extends Context.Service<
  DownloadStore,
  {
    /** Downloads `url` for the Episode; `onProgress` gets (received, total or null). */
    readonly save: (
      episodeId: string,
      url: string,
      onProgress?: (received: number, total: number | null) => void
    ) => Effect.Effect<StoredDownload, DownloadError>
    readonly has: (episodeId: string) => Effect.Effect<boolean>
    readonly remove: (episodeId: string) => Effect.Effect<void>
    readonly list: Effect.Effect<ReadonlyArray<StoredDownload>>
    /** A URL the Player can use for a stored download, or null if it isn't stored. */
    readonly playableUrl: (episodeId: string) => Effect.Effect<string | null>
  }
>()("@podlist/web/DownloadStore") {
  static readonly layerWeb = Layer.effect(
    DownloadStore,
    Effect.gen(function* () {
      const directory = yield* Effect.promise(async () =>
        (await navigator.storage.getDirectory()).getDirectoryHandle("downloads", { create: true })
      )
      const fileName = (episodeId: string) => `${encodeURIComponent(episodeId)}.audio`
      const objectUrls = new Map<string, string>()

      const fileFor = (episodeId: string) =>
        Effect.tryPromise(() => directory.getFileHandle(fileName(episodeId))).pipe(
          Effect.flatMap((handle) => Effect.promise(() => handle.getFile())),
          Effect.option
        )

      const save = (
        episodeId: string,
        url: string,
        onProgress?: (received: number, total: number | null) => void
      ) =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch(url)
            if (!response.ok || response.body === null) throw new Error(`HTTP ${response.status}`)
            const total = Number(response.headers.get("content-length")) || null
            const partial = `${fileName(episodeId)}.part`
            const handle = await directory.getFileHandle(partial, { create: true })
            const writable = await handle.createWritable()
            let received = 0
            const reader = response.body.getReader()
            for (;;) {
              const { done, value } = await reader.read()
              if (done) break
              await writable.write(value)
              received += value.byteLength
              onProgress?.(received, total)
            }
            await writable.close()
            // Only a complete file gets the real name, so a dropped download never looks stored.
            await (handle as FileSystemFileHandle & { move(name: string): Promise<void> }).move(
              fileName(episodeId)
            )
            return { episodeId, bytes: received }
          },
          catch: (e) =>
            new DownloadError({ episodeId, message: e instanceof Error ? e.message : String(e) })
        })

      const remove = (episodeId: string) =>
        Effect.promise(async () => {
          const objectUrl = objectUrls.get(episodeId)
          if (objectUrl !== undefined) URL.revokeObjectURL(objectUrl)
          objectUrls.delete(episodeId)
          await directory.removeEntry(fileName(episodeId)).catch(() => undefined)
        })

      const list = Effect.promise(async () => {
        const stored: Array<StoredDownload> = []
        for await (const [name, handle] of (
          directory as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }
        ).entries()) {
          if (handle.kind !== "file" || !name.endsWith(".audio")) continue
          const file = await (handle as FileSystemFileHandle).getFile()
          stored.push({
            episodeId: decodeURIComponent(name.slice(0, -".audio".length)),
            bytes: file.size
          })
        }
        return stored
      })

      return DownloadStore.of({
        save,
        has: (episodeId) => fileFor(episodeId).pipe(Effect.map((file) => file._tag === "Some")),
        remove,
        list,
        playableUrl: (episodeId) =>
          fileFor(episodeId).pipe(
            Effect.map((file) => {
              if (file._tag === "None") return null
              const existing = objectUrls.get(episodeId)
              if (existing !== undefined) return existing
              const created = URL.createObjectURL(file.value)
              objectUrls.set(episodeId, created)
              return created
            })
          )
      })
    })
  )
}
