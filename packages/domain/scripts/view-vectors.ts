import { Schema } from "effect"
import { Library, Operation, Protocol, State } from "../src/index.ts"
import { initialState } from "./protocol.ts"

const day = 86_400_000
const now = 100 * day
const sub = (id: string, title: string, unsubscribedAt: number | null = null) => ({
  id,
  title,
  feedUrl: `https://example.test/${id}`,
  author: null,
  description: null,
  artwork: null,
  subscribedAt: 0,
  unsubscribedAt,
  playedThreshold: null,
  playbackSettings: {}
})
const ep = (
  id: string,
  subscriptionId: string,
  title: string,
  age: number,
  duration: number | null,
  description = ""
) => ({
  id,
  subscriptionId,
  guid: id,
  title,
  description,
  published: now - age * day,
  duration,
  audioUrl: `https://example.test/${id}.mp3`,
  artwork: null,
  chapters: [],
  audioUpdatedAt: null
})
const newest = ["h", "e", "f", "a", "b", "c", "d"]
const cases: Array<{
  name: string
  view: {
    id: string
    name: string
    filter: Record<string, unknown>
    sort: string
    limit: number | null
  }
  expected: Array<string>
  episodes?: ReadonlyArray<ReturnType<typeof ep>>
  now?: number
}> = []
const check = (
  name: string,
  filter: Record<string, unknown>,
  expected: Array<string>,
  sort = "publishedDesc",
  limit: number | null = null
) => {
  cases.push({ name, view: { id: "v", name, filter, sort, limit }, expected })
}
check(
  "Library includes only retained Orphaned Episodes; Published ties use binary Episode id",
  {},
  newest
)
check(
  "Published oldest first with identical-date ties",
  {},
  ["d", "c", "a", "b", "e", "f", "h"],
  "publishedAsc"
)
check(
  "Length ascending includes zero; unknown Length last",
  {},
  ["h", "e", "f", "a", "b", "c", "d"],
  "durationAsc"
)
check(
  "Length descending keeps unknown last and id ascending on ties",
  {},
  ["c", "a", "b", "e", "f", "h", "d"],
  "durationDesc"
)
check(
  "Show limit applies after filtering and sorting",
  { played: "unplayed" },
  ["h", "e"],
  "publishedDesc",
  2
)
check("Show limit larger than matches", { starred: true }, ["e", "a"], "publishedDesc", 20)
check(
  "LastDays lower boundary inclusive; future Published also matches",
  { published: { _tag: "LastDays", days: 2 } },
  ["h", "e", "f", "a", "b", "c"]
)
check(
  "Between endpoints inclusive, millisecond precision",
  { published: { _tag: "Between", from: now - 2 * day, to: now - day } },
  ["a", "b", "c"]
)
check(
  "Between one millisecond inside boundaries excludes both dates",
  { published: { _tag: "Between", from: now - 2 * day + 1, to: now - day - 1 } },
  []
)
check("Between open start", { published: { _tag: "Between", from: null, to: now - 2 * day } }, [
  "c",
  "d"
])
check("Between open end", { published: { _tag: "Between", from: now, to: null } }, ["h", "e", "f"])
check(
  "Between both endpoints open",
  { published: { _tag: "Between", from: null, to: null } },
  newest
)
check(
  "Between reversed bounds matches nothing",
  { published: { _tag: "Between", from: now, to: now - day } },
  []
)
check("Podcasts include", { podcasts: { mode: "include", subscriptionIds: ["sci"] } }, ["a", "c"])
check(
  "Podcasts exclude several",
  { podcasts: { mode: "exclude", subscriptionIds: ["sci", "gone"] } },
  ["h", "b", "d"]
)
check("Podcasts unknown id", { podcasts: { mode: "include", subscriptionIds: ["missing"] } }, [])
check("Mentions ASCII case insensitive substring", { text: "aI" }, ["a", "b", "c"])
check("Mentions words may match different fields", { text: "  SCIence\tdevice\n" }, ["a"])
check("Mentions every word required, any order", { text: "device small" }, ["a", "d"])
check("Mentions ignores accents and case", { text: "café" }, ["h", "a", "b", "c"])
check("Mentions uppercase accented letters fold", { text: "CAFÉ" }, ["h", "a", "b", "c"])
check("Mentions unaccented text matches accents", { text: "cafe" }, ["h", "a", "b", "c"])
check("Mentions percent literal", { text: "%" }, ["a"])
check("Mentions underscore literal", { text: "_" }, ["a"])
check("Mentions backslash literal", { text: "\\" }, ["a"])
check("Mentions whitespace only currently matches everything", { text: " \t " }, newest)
check("Played", { played: "played" }, ["b"])
check("Unplayed includes Entries in progress", { played: "unplayed" }, [
  "h",
  "e",
  "f",
  "a",
  "c",
  "d"
])
check(
  "In progress means positive Position in any Playlist and Unplayed",
  { played: "inProgress" },
  ["a"]
)
check("Starred", { starred: true }, ["e", "a"])
check("Not Starred", { starred: false }, ["h", "f", "b", "c", "d"])
check("Not in a Playlist checks all Playlists", { notInAnyPlaylist: true }, ["h", "e", "d"])
check("Minimum Length inclusive, unknown excluded", { minDuration: 60 }, ["a", "b", "c"])
check("Maximum Length inclusive, unknown excluded", { maxDuration: 60 }, ["h", "e", "f", "a", "b"])
check("Exact Length combines both bounds", { minDuration: 60, maxDuration: 60 }, ["a", "b"])
check(
  "All conditions AND together",
  {
    published: { _tag: "LastDays", days: 3 },
    podcasts: { mode: "include", subscriptionIds: ["tech"] },
    text: "device",
    played: "unplayed",
    starred: false,
    notInAnyPlaylist: true
  },
  ["d"]
)

cases.push({
  name: "LastDays boundary excludes one millisecond earlier than rolling cutoff",
  view: {
    id: "v",
    name: "Rolling cutoff",
    filter: { published: { _tag: "LastDays", days: 2 } },
    sort: "publishedDesc",
    limit: null
  },
  now: now + 1,
  expected: ["h", "e", "f", "a", "b"]
})
cases.push({
  name: "LastDays uses rolling 24-hour days rather than calendar dates",
  view: {
    id: "v",
    name: "Rolling day",
    filter: { published: { _tag: "LastDays", days: 2 } },
    sort: "publishedDesc",
    limit: null
  },
  now: now + day / 2,
  expected: ["h", "e", "f", "a", "b"]
})
check("Mentions normalizes decomposed accents", { text: "Cafe\u0301" }, ["h", "a", "b", "c"])

// Independent expected results, shared by SQLite hosts and native clients.
for (const [title, text, matches] of [
  ["Café", "cafe", true],
  ["e\u0301", "É", true],
  ["été", "ÉTÉ", true],
  ["Straße", "STRASSE", true],
  ["ẞ", "ss", true],
  ["İSTANBUL", "istanbul", true],
  ["I", "i", true],
  ["ı", "i", false],
  ["i", "ı", false],
  ["ПРИВЕТ", "привет", true],
  ["Ёлка", "елка", true],
  ["ΟΣ ος", "οσ", true],
  ["𐐀", "𐐨", true],
  ["한", "한", true],
  ["cafe\u0301", "CAFÉ", true]
] as const) {
  cases.push({
    name: `Mentions Unicode: ${JSON.stringify(title)} searched with ${JSON.stringify(text)}`,
    view: { id: "v", name: "Unicode", filter: { text }, sort: "publishedDesc", limit: null },
    episodes: [ep("unicode", "tech", title, 0, 60)],
    expected: matches ? ["unicode"] : []
  })
}

cases.push({
  name: "Mentions folds show notes and podcast names as well as titles",
  view: {
    id: "v",
    name: "All fields",
    filter: { text: "SCIENCE ÉTÉ привет" },
    sort: "publishedDesc",
    limit: null
  },
  episodes: [ep("unicode-fields", "sci", "ÉTÉ", 0, 60, "ПРИВЕТ")],
  expected: ["unicode-fields"]
})

for (const sort of ["publishedAsc", "publishedDesc", "durationAsc", "durationDesc"]) {
  cases.push({
    name: `Binary Episode id tie-break for ${sort}, independent of input order and locale`,
    view: { id: "v", name: "Binary tie", filter: {}, sort, limit: null },
    episodes: ["é", "e2", "a", "Z", "e10"].map((id) => ep(id, "tech", "Tie", 1, 60)),
    expected: ["Z", "a", "e10", "e2", "é"]
  })
}

export const buildViewVectors = () => {
  const changes = [
    { _tag: "AddEntry", playlistId: "default", episodeId: "c", placement: "last" },
    { _tag: "CreatePlaylist", playlistId: "other", name: "Other", clearOnPlayed: false },
    ...["a", "b", "f"].map((episodeId) => ({
      _tag: "AddEntry",
      playlistId: "other",
      episodeId,
      placement: "last"
    })),
    ...["a", "b"].map((episodeId) => ({
      _tag: "ReportPosition",
      playlistId: "other",
      episodeId,
      position: 5,
      listenedAt: 1
    })),
    { _tag: "MarkPlayed", episodeId: "b", source: { _tag: "User" } },
    ...["a", "e"].map((episodeId) => ({ _tag: "SetStar", episodeId, starred: true }))
  ]
  const operations = changes.map((change, sequence) =>
    Schema.decodeUnknownSync(Operation.Operation)({
      id: `view-${sequence}`,
      deviceId: "phone",
      sequence,
      recordedAt: 1,
      change
    })
  )
  return {
    protocolVersion: Protocol.version,
    now,
    subscriptions: [
      sub("sci", "Sciénce"),
      sub("tech", "Technology"),
      sub("gone", "Removed", 1)
    ].map((value) => Schema.decodeUnknownSync(Library.Subscription)(value)),
    episodes: [
      ep("a", "sci", "Café AI 100%_\\", 1, 60, "small device"),
      ep("b", "tech", "CAFÉ ai", 1, 60, "model"),
      ep("c", "sci", "Cafe AI", 2, 120),
      ep("d", "tech", "Quiet", 3, null, "DEVICE small"),
      ep("e", "gone", "Orphan Star", 0, 30),
      ep("f", "gone", "Orphan Entry", 0, 30),
      ep("g", "gone", "Removed", 0, 10),
      ep("h", "tech", "café", -1, 0)
    ].map((value) => Schema.decodeUnknownSync(Library.Episode)(value)),
    state: Schema.encodeSync(State.State)(State.applyOperations(initialState(), operations).state),
    cases
  }
}
