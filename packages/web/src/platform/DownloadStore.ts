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
    /**
     * Downloads `url` for the Episode; `onProgress` gets (received, total or null).
     * Interrupting it stops the transfer and leaves nothing behind.
     */
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
      const typeName = (episodeId: string) => `${encodeURIComponent(episodeId)}.type`
      const typeOf = (episodeId: string) =>
        Effect.promise(async () => {
          try {
            const file = await (await directory.getFileHandle(typeName(episodeId))).getFile()
            return (await file.text()) || "audio/mpeg"
          } catch {
            return "audio/mpeg"
          }
        })
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
          try: async (signal) => {
            const source =
              location.protocol === "app:" && /^https?:/.test(url)
                ? `app://podlist/audio-download?url=${encodeURIComponent(url)}`
                : url
            const response = await fetch(source, { signal, credentials: "omit" })
            if (!response.ok || response.body === null) throw new Error(`HTTP ${response.status}`)
            const total = Number(response.headers.get("content-length")) || null
            const type = response.headers.get("content-type")?.split(";")[0]?.trim() || "audio/mpeg"
            const partial = `${fileName(episodeId)}.part`
            const handle = await directory.getFileHandle(partial, { create: true })
            const writable = await handle.createWritable()
            let received = 0
            const reader = response.body.getReader()
            try {
              for (;;) {
                const { done, value } = await reader.read()
                if (done) break
                await writable.write(value)
                received += value.byteLength
                onProgress?.(received, total)
              }
              await writable.close()
            } catch (error) {
              await writable.abort().catch(() => undefined)
              await directory.removeEntry(partial).catch(() => undefined)
              throw error
            }
            // Only a complete file gets the real name, so a dropped download never looks stored.
            // Chrome won't play an untyped file from OPFS, so remember its type alongside.
            const typeFile = await directory.getFileHandle(typeName(episodeId), { create: true })
            const typeWriter = await typeFile.createWritable()
            await typeWriter.write(type)
            await typeWriter.close()
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
          await directory.removeEntry(typeName(episodeId)).catch(() => undefined)
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
          Effect.gen(function* () {
            const file = yield* fileFor(episodeId)
            if (file._tag === "None") return null
            const existing = objectUrls.get(episodeId)
            if (existing !== undefined) return existing
            // A typed view of the stored file (no copy): untyped OPFS files don't play.
            const typed = new Blob([file.value], { type: yield* typeOf(episodeId) })
            const created = URL.createObjectURL(typed)
            objectUrls.set(episodeId, created)
            return created
          })
      })
    })
  )
}
