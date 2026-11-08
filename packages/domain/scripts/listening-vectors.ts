import { Protocol } from "../src/index.ts"

interface Measurement {
  readonly name: string
  readonly before: { at: number; position: number } | null
  readonly after: { at: number; position: number }
  readonly speed: number
  /** Same sign as Date.getTimezoneOffset(): UTC minus local, in minutes. */
  readonly offsetMinutes: number
  readonly subscriptionId: string
  readonly expected: ReadonlyArray<{ day: string; subscriptionId: string; seconds: number }>
}
const samples: Array<Measurement> = []
const sample = (
  name: string,
  position: number,
  elapsed: number,
  speed: number,
  seconds: number,
  before: Measurement["before"] = { at: 0, position: 100 }
) =>
  samples.push({
    name,
    before,
    after: { at: elapsed * 1000, position },
    speed,
    offsetMinutes: 0,
    subscriptionId: "science",
    expected: seconds === 0 ? [] : [{ day: "1970-01-01", subscriptionId: "science", seconds }]
  })
sample("Normal playback", 115, 15, 1, 15)
sample("Double speed counts wall seconds", 130, 15, 2, 15)
sample("Slow playback counts wall seconds", 111.25, 15, 0.75, 15)
sample("Progress shorter than wall time", 110, 15, 1, 10)
sample("One second jitter accepted but capped", 116, 15, 1, 15)
sample("Beyond jitter is a forward seek", 116.001, 15, 1, 0)
sample("Backward seek", 80, 15, 1, 0)
sample("Stationary Position", 100, 15, 1, 0)
sample("Gap exactly 30 seconds counts", 130, 30, 1, 30)
sample("Gap over 30 seconds counts nothing", 130, 30.001, 1, 0)
sample("Same clock instant", 115, 0, 1, 0)
sample("Clock moved backwards", 115, -1, 1, 0)
sample("Zero speed", 115, 15, 0, 0)
sample("Negative speed", 115, 15, -1, 0)
sample("First event has no preceding sample", 115, 15, 1, 0, null)
sample("Pause clears the preceding sample; paused Position cannot count", 200, 15, 1, 0, null)
sample("Seek or Player Discontinuity resets the boundary", 200, 15, 1, 0, null)
sample("Changing speed resets the boundary", 200, 15, 2, 0, null)
for (const [name, after, offsetMinutes] of [
  ["UTC midnight", Date.UTC(2026, 10, 9, 0, 0, 5), 0],
  ["UTC plus 05:30 midnight", Date.UTC(2026, 10, 8, 18, 30, 5), -330],
  ["UTC minus 08:00 midnight", Date.UTC(2026, 10, 9, 8, 0, 5), 480]
] as const)
  samples.push({
    name,
    before: { at: after - 15000, position: 0 },
    after: { at: after, position: 15 },
    speed: 1,
    offsetMinutes,
    subscriptionId: "night",
    expected: [
      { day: "2026-11-08", subscriptionId: "night", seconds: 10 },
      { day: "2026-11-09", subscriptionId: "night", seconds: 5 }
    ]
  })
samples.push({
  name: "Exact midnight belongs entirely to preceding day",
  before: { at: 86400000 - 15000, position: 0 },
  after: { at: 86400000, position: 15 },
  speed: 1,
  offsetMinutes: 0,
  subscriptionId: "night",
  expected: [{ day: "1970-01-01", subscriptionId: "night", seconds: 15 }]
})
samples.push({
  name: "Partial progress is attributed to the end of the interval",
  before: { at: 86400000 - 10000, position: 0 },
  after: { at: 86400000 + 5000, position: 5 },
  speed: 1,
  offsetMinutes: 0,
  subscriptionId: "night",
  expected: [{ day: "1970-01-02", subscriptionId: "night", seconds: 5 }]
})
samples.push({
  name: "Ending offset applies to the entire sample after a timezone change",
  before: { at: Date.UTC(2026, 10, 8, 23, 59, 50), position: 0 },
  after: { at: Date.UTC(2026, 10, 9, 0, 0, 5), position: 15 },
  speed: 1,
  offsetMinutes: -60,
  subscriptionId: "travel",
  expected: [{ day: "2026-11-09", subscriptionId: "travel", seconds: 15 }]
})
samples.push({
  name: "Year boundary splits by Device calendar",
  before: { at: Date.UTC(2026, 11, 31, 23, 59, 50), position: 0 },
  after: { at: Date.UTC(2027, 0, 1, 0, 0, 5), position: 15 },
  speed: 1,
  offsetMinutes: 0,
  subscriptionId: "night",
  expected: [
    { day: "2026-12-31", subscriptionId: "night", seconds: 10 },
    { day: "2027-01-01", subscriptionId: "night", seconds: 5 }
  ]
})

const thresholds = [
  {
    name: "Default just before threshold",
    position: 569.999,
    duration: 600,
    threshold: null,
    expected: false
  },
  {
    name: "Default exact threshold",
    position: 570,
    duration: 600,
    threshold: null,
    expected: true
  },
  {
    name: "Subscription override before",
    position: 589.999,
    duration: 600,
    threshold: 10,
    expected: false
  },
  {
    name: "Subscription override exact",
    position: 590,
    duration: 600,
    threshold: 10,
    expected: true
  },
  {
    name: "Zero threshold before end",
    position: 599.999,
    duration: 600,
    threshold: 0,
    expected: false
  },
  { name: "Zero threshold at end", position: 600, duration: 600, threshold: 0, expected: true },
  { name: "Beyond duration", position: 700, duration: 600, threshold: 0, expected: true },
  {
    name: "Shorter than default threshold",
    position: 0,
    duration: 20,
    threshold: null,
    expected: true
  },
  {
    name: "Override longer than Episode",
    position: 0,
    duration: 60,
    threshold: 90,
    expected: true
  },
  { name: "Zero duration", position: 0, duration: 0, threshold: null, expected: true },
  {
    name: "Unknown duration cannot finish by Position",
    position: 9999,
    duration: null,
    threshold: null,
    expected: false
  }
]
export const buildListeningVectors = () => ({
  protocolVersion: Protocol.version,
  samples,
  thresholds,
  sessions: listeningSessions
})

// Player lifecycle vectors complement isolated samples: these run against the actual
// Playback service as well, so boundary resets cannot drift from the sampler contract.
export const listeningSessions = [
  {
    name: "pause-seek-speed-discontinuity",
    initial: {
      episodeId: "e2",
      subscriptionId: "s",
      position: 20,
      speed: 1.5,
      duration: 60,
      clearOnPlayed: false
    },
    steps: [
      { at: 0, action: "play", expectedSeconds: 0 },
      { at: 10000, action: "position", position: 35, duration: 600, expectedSeconds: 10 },
      { at: 10000, action: "pause", expectedSeconds: 10 },
      { at: 20000, action: "position", position: 35, duration: 600, expectedSeconds: 10 },
      { at: 20000, action: "play", expectedSeconds: 10 },
      { at: 30000, action: "position", position: 50, duration: 600, expectedSeconds: 20 },
      { at: 30000, action: "seek", position: 200, expectedSeconds: 20 },
      { at: 31000, action: "position", position: 201.5, duration: 600, expectedSeconds: 20 },
      { at: 41000, action: "position", position: 216.5, duration: 600, expectedSeconds: 30 },
      { at: 41000, action: "speed", speed: 2, expectedSeconds: 30 },
      { at: 42000, action: "position", position: 218.5, duration: 600, expectedSeconds: 30 },
      { at: 52000, action: "position", position: 238.5, duration: 600, expectedSeconds: 40 },
      { at: 52000, action: "discontinuity", expectedSeconds: 40 },
      { at: 53000, action: "position", position: 300, duration: 600, expectedSeconds: 40 },
      { at: 63000, action: "position", position: 320, duration: 600, expectedSeconds: 50 },
      { at: 63000, action: "pause", expectedSeconds: 50 }
    ],
    expectedPlayed: false,
    expectedEntryPosition: 320
  },
  {
    name: "listening-tail-after-Played",
    initial: {
      episodeId: "e2",
      subscriptionId: "s",
      position: 20,
      speed: 1.5,
      duration: 60,
      clearOnPlayed: false
    },
    steps: [
      { at: 0, action: "play", expectedSeconds: 0 },
      { at: 15000, action: "position", position: 42.5, duration: 60, expectedSeconds: 15 },
      { at: 20000, action: "position", position: 50, duration: 60, expectedSeconds: 20 },
      { at: 20000, action: "pause", expectedSeconds: 20 }
    ],
    expectedPlayed: true,
    expectedEntryPosition: 0
  }
] as const
