// Where the current screen was reached from, so a screen's back link can say where it
// goes ("‹ Commute" rather than "‹ Back"). AppShell records it on every navigation.

let from: string | null = null

export const cameFrom = {
  get: () => from,
  set: (pathname: string) => {
    from = pathname
  }
}
