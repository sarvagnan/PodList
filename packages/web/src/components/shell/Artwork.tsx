import { useState } from "react"
import { artworkSrc } from "../../lib/artwork.ts"

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
  size,
  className
}: {
  readonly url: string | null
  readonly name: string
  /** The size it is drawn at, in CSS px; picks the image size. */
  readonly size: number
  /** Replaces the fixed size, for artwork that fills its container. */
  readonly className?: string
}) {
  const [failed, setFailed] = useState<string | null>(null)
  const box = className ?? "shrink-0 rounded-lg"
  const style = className ? {} : { width: size, height: size }
  if (url !== null && failed !== url) {
    return (
      <img
        src={artworkSrc(url, size)}
        alt=""
        style={style}
        onError={() => setFailed(url)}
        className={`${box} bg-accent object-cover`}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize: `${(size * 0.34) / 16}rem` }}
      className={`${box} grid place-items-center bg-accent font-heading font-semibold text-accent-foreground`}
    >
      {initials(name)}
    </span>
  )
}
