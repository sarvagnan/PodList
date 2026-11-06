import { useState } from "react"

// A podcast or Episode image, or the podcast's initials on a tinted tile when it has none
// or it fails to load. The tile shows behind the image while it loads.

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")

export function Artwork({
  url,
  name,
  size
}: {
  readonly url: string | null
  readonly name: string
  readonly size: number
}) {
  const [failed, setFailed] = useState<string | null>(null)
  const style = { width: size, height: size }
  if (url !== null && failed !== url) {
    return (
      <img
        src={url}
        alt=""
        style={style}
        onError={() => setFailed(url)}
        className="shrink-0 rounded-lg bg-accent object-cover"
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      style={style}
      className="grid shrink-0 place-items-center rounded-lg bg-accent font-heading font-semibold text-accent-foreground"
    >
      {initials(name)}
    </span>
  )
}
