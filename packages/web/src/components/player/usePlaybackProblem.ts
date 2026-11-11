import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { useEffect } from "react"
import { localClient } from "#client"
import { playbackAtom, syncStatusAtom } from "../../app/runtime.ts"
import { useOnline } from "../../lib/useOnline.ts"
import { useDownloadStatus } from "../episodes/DownloadButton.tsx"

/**
 * Why the Episode in the player won't play, in plain words, and what can be done
 * (COPY-02): offline with nothing stored on this Device is said as that, and it plays by
 * itself once the connection is back; otherwise Try again.
 */
export function usePlaybackProblem(
  current: { readonly episodeId: string; readonly error: string | null } | null
) {
  const online = useOnline()
  const sync = AsyncResult.getOrElse(useAtomValue(syncStatusAtom), () => null)
  const stored = useDownloadStatus(current?.episodeId ?? "")?._tag === "Stored"
  const control = useAtomSet(playbackAtom)
  const error = current?.error ?? null
  const offline = error !== null && !online && !stored
  // Back online: try once more, without being asked.
  useEffect(() => {
    if (error === null || online || stored) return
    const retry = () => control({ _tag: "retry" })
    window.addEventListener("online", retry, { once: true })
    return () => window.removeEventListener("online", retry)
  }, [error, online, stored, control])
  if (error === null) return null
  return offline
    ? {
        short: localClient ? "Not downloaded" : "Offline",
        long: localClient
          ? "You’re offline, and this Episode isn’t downloaded on this Device. It plays when you’re back online; a downloaded Episode plays now."
          : "You’re offline. This Episode can play when its host or your server is reachable again.",
        retry: null
      }
    : {
        short: "Couldn’t play",
        long: sync?.error
          ? localClient
            ? "This Episode’s host didn’t load its audio, and your PodList server can’t be reached for a fallback. Downloaded Episodes still play; edits are kept and sync later."
            : "This Episode’s host didn’t load its audio, and your server can’t be reached for a fallback. Pending changes stay in this tab."
          : "Couldn’t play this Episode: neither its host nor your PodList server loaded its audio.",
        retry: () => control({ _tag: "retry" })
      }
}
