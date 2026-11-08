import { Schema } from "effect"
import { SubscriptionId } from "./Ids.ts"
import { Seconds } from "./Units.ts"

/** Calendar dates are captured on the listening Device, never reinterpreted on replay. */
export const Day = Schema.String.pipe(Schema.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/)))
export const Log = Schema.Record(Day, Schema.Record(Schema.String, Seconds))
export type Log = typeof Log.Type
export const Amount = Schema.Struct({ day: Day, subscriptionId: SubscriptionId, seconds: Seconds })
export type Amount = typeof Amount.Type

export interface Sample {
  readonly at: number
  readonly position: number
}

/** Reject jumps and long gaps; speed converts audio progress into actual listening time. */
export const sample = (
  before: Sample | null,
  after: Sample,
  speed: number,
  offsetMinutes: number
): ReadonlyArray<{ readonly day: string; readonly seconds: number }> => {
  if (before === null || speed <= 0) return []
  const elapsed = (after.at - before.at) / 1000
  const progress = (after.position - before.position) / speed
  if (elapsed <= 0 || elapsed > 30 || progress <= 0 || progress > elapsed + 1) return []
  const seconds = Math.min(elapsed, progress)
  if (!Number.isFinite(seconds)) return []
  const offset = offsetMinutes * 60_000
  const start = after.at - seconds * 1000
  const midnight = (Math.floor((start - offset) / 86_400_000) + 1) * 86_400_000 + offset
  const day = (at: number) => new Date(at - offset).toISOString().slice(0, 10)
  if (midnight >= after.at) return [{ day: day(start), seconds }]
  return [
    { day: day(start), seconds: (midnight - start) / 1000 },
    { day: day(after.at), seconds: (after.at - midnight) / 1000 }
  ]
}

/** Operation ids provide deduplication; addition preserves concurrent offline listening. */
export const add = (log: Log, amounts: ReadonlyArray<Amount>): Log => {
  const next = { ...log }
  for (const amount of amounts) {
    const podcasts = next[amount.day] ?? {}
    next[amount.day] = {
      ...podcasts,
      [amount.subscriptionId]: Seconds.make((podcasts[amount.subscriptionId] ?? 0) + amount.seconds)
    }
  }
  return next
}

/** Local date keys for display periods; logged days keep the listening Device's calendar. */
export const localDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

export const stats = (
  log: Log,
  played: ReadonlyArray<{ readonly at: number; readonly source: { readonly _tag: string } }>,
  now: Date
) => {
  const today = localDay(now)
  const week = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  const month = localDay(new Date(now.getFullYear(), now.getMonth(), 1))
  const periods = [localDay(week), month, "0000-01-01"]
  const totals = periods.map((start) => ({
    seconds: Object.entries(log)
      .filter(([day]) => start === "0000-01-01" || (day >= start && day <= today))
      .reduce((sum, [, podcasts]) => sum + Object.values(podcasts).reduce((a, b) => a + b, 0), 0),
    finished: played.filter(
      (p) =>
        p.source._tag === "Playback" && p.at <= now.getTime() && localDay(new Date(p.at)) >= start
    ).length
  }))
  const days = Array.from({ length: 30 }, (_, i) => {
    const day = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + i))
    return { day, seconds: Object.values(log[day] ?? {}).reduce((a, b) => a + b, 0) }
  })
  const podcasts = new Map<string, number>()
  // Another Device can already be on tomorrow’s date; all-time still includes its listen.
  for (const amounts of Object.values(log)) {
    for (const [id, seconds] of Object.entries(amounts))
      podcasts.set(id, (podcasts.get(id) ?? 0) + seconds)
  }
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const heard = () => Object.values(log[localDay(cursor)] ?? {}).some((s) => s > 0)
  // Yesterday keeps the current streak alive until the user has had today to listen.
  if (!heard()) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (heard()) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return {
    totals,
    days,
    streak,
    podcasts: [...podcasts]
      .filter(([, seconds]) => seconds > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }
}
