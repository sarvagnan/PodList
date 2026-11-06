import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { Ids, Operation, PlaybackSettings, Playlist, State, Units } from "../src/index.ts"

const pl = (id: string) => Ids.PlaylistId.make(id)
const at = Units.EpochMillis.make(1000)
const settings = new PlaybackSettings.PlaybackSettings({
  speed: 1,
  skipIntro: Units.Seconds.make(0),
  skipOutro: Units.Seconds.make(0),
  volumeBoost: false
})

const decodeChange = Schema.decodeUnknownSync(Operation.Change)
const run = (state: State.State, ...changes: Array<unknown>) =>
  changes.reduce<State.State>((s, c) => State.apply(s, decodeChange(c), { at }), state)

const playlist = (state: State.State, id = "default") => {
  const found = state.playlists.find((p) => p.id === id)
  if (found === undefined) throw new Error(`no playlist ${id}`)
  return found
}
const order = (state: State.State, id = "default") =>
  playlist(state, id).entries.map((e) => e.episodeId)
const cursor = (state: State.State, id = "default") => playlist(state, id).cursor

const add = (episodeId: string, placement: string, playlistId = "default") => ({
  _tag: "AddEntry",
  playlistId,
  episodeId,
  placement
})

/** Default holds A, B, C with B current and 600 s into B. */
const abc = () => {
  const s = run(State.initial(settings), add("A", "last"), add("B", "last"), add("C", "last"), {
    _tag: "SetCursor",
    playlistId: "default",
    episodeId: "B"
  })
  const p = playlist(s)
  const withPosition = new Playlist.Playlist({
    ...p,
    entries: p.entries.map((e) =>
      e.episodeId === "B" ? new Playlist.Entry({ ...e, position: Units.Seconds.make(600) }) : e
    )
  })
  return new State.State({ ...s, playlists: [withPosition] })
}

describe("Play Now / Next / Last", () => {
  it("Play Now goes before the current Entry and starts; the old current comes next", () => {
    const s = run(abc(), add("X", "now"))
    expect(order(s)).toEqual(["A", "X", "B", "C"])
    expect(cursor(s)).toBe("X")
    expect(playlist(s).entries.find((e) => e.episodeId === "B")?.position).toBe(600)
  })

  it("Play Next goes right after the current Entry without changing it", () => {
    const s = run(abc(), add("X", "next"))
    expect(order(s)).toEqual(["A", "B", "X", "C"])
    expect(cursor(s)).toBe("B")
  })

  it("Play Last goes to the end", () => {
    const s = run(abc(), add("X", "last"))
    expect(order(s)).toEqual(["A", "B", "C", "X"])
    expect(cursor(s)).toBe("B")
  })

  it("moves an Episode that is already an Entry instead of duplicating it", () => {
    const s = run(abc(), add("A", "next"))
    expect(order(s)).toEqual(["B", "A", "C"])
  })

  it("keeps the moved Entry's Position", () => {
    const s = run(abc(), add("B", "last"))
    expect(playlist(s).entries.at(-1)?.position).toBe(600)
  })

  it("Play Last on the current Entry makes the following Entry current", () => {
    const s = run(abc(), add("B", "last"))
    expect(order(s)).toEqual(["A", "C", "B"])
    expect(cursor(s)).toBe("C")
  })

  it("Play Now on the current Entry changes nothing", () => {
    const s = abc()
    expect(run(s, add("B", "now"))).toBe(s)
  })

  it("an empty Playlist's first Entry becomes current", () => {
    const s = run(State.initial(settings), add("A", "last"))
    expect(cursor(s)).toBe("A")
  })

  it("when the Cursor has run past the end, the added Entry plays next", () => {
    const s = run(
      abc(),
      { _tag: "SetCursor", playlistId: "default", episodeId: null },
      add("X", "next")
    )
    expect(order(s)).toEqual(["A", "B", "C", "X"])
    expect(cursor(s)).toBe("X")
  })
})

describe("reorder, remove and Cursor", () => {
  it("moves an Entry after another, or to the top", () => {
    expect(
      order(run(abc(), { _tag: "MoveEntry", playlistId: "default", episodeId: "A", after: "C" }))
    ).toEqual(["B", "C", "A"])
    expect(
      order(run(abc(), { _tag: "MoveEntry", playlistId: "default", episodeId: "C", after: null }))
    ).toEqual(["C", "A", "B"])
  })

  it("drops a move whose anchor is gone", () => {
    const s = abc()
    expect(run(s, { _tag: "MoveEntry", playlistId: "default", episodeId: "A", after: "Z" })).toBe(s)
  })

  it("removing the current Entry makes the next one current, or none at the end", () => {
    const removedB = run(abc(), { _tag: "RemoveEntry", playlistId: "default", episodeId: "B" })
    expect(order(removedB)).toEqual(["A", "C"])
    expect(cursor(removedB)).toBe("C")
    const atEnd = run(
      abc(),
      { _tag: "SetCursor", playlistId: "default", episodeId: "C" },
      { _tag: "RemoveEntry", playlistId: "default", episodeId: "C" }
    )
    expect(cursor(atEnd)).toBeNull()
  })

  it("ignores a Cursor pointing at an Episode that is not an Entry", () => {
    const s = abc()
    expect(run(s, { _tag: "SetCursor", playlistId: "default", episodeId: "Z" })).toBe(s)
  })

  it("drops changes to a Playlist that does not exist", () => {
    const s = abc()
    expect(run(s, add("X", "last", "gone"))).toBe(s)
  })
})

describe("Playlists", () => {
  it("never renames or deletes the Default Playlist", () => {
    const s = abc()
    expect(run(s, { _tag: "RenamePlaylist", playlistId: "default", name: "Inbox" })).toBe(s)
    expect(run(s, { _tag: "DeletePlaylist", playlistId: "default" })).toBe(s)
  })

  it("deleting the Active Playlist makes Default Active", () => {
    const s = run(
      abc(),
      { _tag: "CreatePlaylist", playlistId: "replay", name: "Replay", clearOnPlayed: false },
      { _tag: "SetActivePlaylist", playlistId: "replay" }
    )
    expect(s.activePlaylistId).toBe("replay")
    const deleted = run(s, { _tag: "DeletePlaylist", playlistId: "replay" })
    expect(deleted.activePlaylistId).toBe("default")
    expect(deleted.playlists.map((p) => p.id)).toEqual(["default"])
  })

  it("does not create a second Playlist with the same id", () => {
    const s = run(abc(), {
      _tag: "CreatePlaylist",
      playlistId: "r",
      name: "Replay",
      clearOnPlayed: false
    })
    expect(
      run(s, { _tag: "CreatePlaylist", playlistId: "r", name: "Other", clearOnPlayed: true })
    ).toBe(s)
    expect(pl("r")).toBe("r")
  })
})
