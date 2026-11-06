/** 1:02:03 or 4:05: a Position or duration in seconds as people read it. */
export const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

/** "45 min" or "1 hr 12 min": an Episode's length in a list. */
export const formatLength = (seconds: number) => {
  const minutes = Math.max(1, Math.round(seconds / 60))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

const dayMillis = 86_400_000

/** "Today", "Yesterday", "3 Nov", or "3 Nov 2025" outside the current year. */
export const formatPublished = (published: number, now = Date.now()) => {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  if (published >= startOfToday) return "Today"
  if (published >= startOfToday - dayMillis) return "Yesterday"
  const date = new Date(published)
  const sameYear = date.getFullYear() === new Date(now).getFullYear()
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" })
  })
}
