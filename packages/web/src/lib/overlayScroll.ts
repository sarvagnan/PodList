import type { AnyRouter } from "@tanstack/react-router"

type EntryState = {
  readonly __TSR_key?: string
  readonly podlistScrollEntry?: unknown
  readonly podlistLayer?: unknown
}
const isLayer = (state: EntryState) => state.podlistLayer === true

/** Overlay history entries belong to the same scrolling screen as their base entry. */
export const scrollEntry = (state: EntryState): string =>
  typeof state.podlistScrollEntry === "string"
    ? state.podlistScrollEntry
    : (state.__TSR_key ?? "initial")

/** Opening or closing a history layer is not navigation to a new scrolling screen. */
export function preserveOverlayScroll(router: AnyRouter) {
  let preserved: string | null = null
  router.subscribe("onBeforeNavigate", ({ fromLocation, toLocation }) => {
    preserved =
      fromLocation?.href === toLocation.href &&
      (isLayer(fromLocation.state) || isLayer(toLocation.state))
        ? (toLocation.state.__TSR_key ?? "initial")
        : null
  })
  router.update({
    scrollRestoration: ({ location }) => (location.state.__TSR_key ?? "initial") !== preserved
  })
}
