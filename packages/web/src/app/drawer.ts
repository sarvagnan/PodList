import { Atom } from "effect/reactivity"

/** Pages that open inside the Now Playing drawer, stacked over its main page. */
export type DrawerPage = "queue" | "episode" | "chapters" | "playlists"

export interface DrawerState {
  readonly open: boolean
  readonly stack: ReadonlyArray<DrawerPage>
}

/** The Now Playing drawer: whether it's open, and the pages opened inside it. */
export const drawerAtom = Atom.make<DrawerState>({ open: false, stack: [] }).pipe(Atom.keepAlive)
