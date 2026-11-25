import { Toast } from "@base-ui/react/toast"
import { useAtomSet } from "@effect/atom-react"
import { useNavigate } from "@tanstack/react-router"
import { Effect, SubscriptionRef } from "effect"
import { useEffect } from "react"
import { useLibraryReady } from "../../app/hooks.ts"
import { runtime } from "../../app/runtime.ts"
import { DataLayer } from "../../data/DataLayer.ts"
import type { PodListLink } from "../../lib/podListLink.ts"

const resolveLink = runtime.fn((link: PodListLink) =>
  Effect.gen(function* () {
    const data = yield* DataLayer
    switch (link.kind) {
      case "podcast":
        return (yield* data.subscriptions).find((item) => item.feedUrl === link.value)?.id ?? null
      case "episode":
        return data.hasLibraryEpisode && (yield* data.hasLibraryEpisode(link.value))
          ? link.value
          : null
      case "playlist":
        return (yield* SubscriptionRef.get(data.state)).playlists.some(
          (item) => item.id === link.value
        )
          ? link.value
          : null
      case "view":
        return (yield* SubscriptionRef.get(data.state)).views.some((item) => item.id === link.value)
          ? link.value
          : null
    }
  })
)

export function DesktopOpenLinks() {
  const ready = useLibraryReady()
  const resolve = useAtomSet(resolveLink, { mode: "promise" })
  const navigate = useNavigate()
  const toast = Toast.useToastManager()

  useEffect(() => {
    const bridge = window.podlistApp?.links
    if (!ready || !bridge) return
    let active = true
    let draining = false
    let signalled = false
    const drain = async () => {
      signalled = true
      if (draining) return
      draining = true
      try {
        while (active && signalled) {
          signalled = false
          for (const link of await bridge.take()) {
            const id = await resolve(link)
            if (!active) return
            if (!id) {
              toast.add({
                description: "This PodList link isn’t available in this Library.",
                timeout: 5000
              })
              continue
            }
            switch (link.kind) {
              case "episode":
                await navigate({ to: "/episodes/$episodeId", params: { episodeId: id } })
                break
              case "playlist":
                await navigate({ to: "/playlists/$playlistId", params: { playlistId: id } })
                break
              case "view":
                await navigate({ to: "/views/$viewId", params: { viewId: id } })
                break
              case "podcast":
                await navigate({ to: "/library/$subscriptionId", params: { subscriptionId: id } })
                break
            }
          }
        }
      } catch {
        if (active) toast.add({ description: "Could not open the PodList link.", timeout: 5000 })
      } finally {
        draining = false
      }
    }
    const unsubscribe = bridge.onAvailable(() => void drain())
    // Strict Mode's first effect can be cleaned up before asynchronous IPC returns.
    const initial = setTimeout(() => void drain(), 0)
    return () => {
      active = false
      clearTimeout(initial)
      unsubscribe()
    }
  }, [ready, resolve, navigate, toast])
  return null
}
