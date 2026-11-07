import { RotateCcw, RotateCw } from "lucide-react"

/** A skip arrow with its seconds inside, so it can't be read as "reload" (APPEAR-09). */
export function SkipIcon({
  seconds,
  direction,
  large = false
}: {
  readonly seconds: number
  readonly direction: "back" | "forward"
  readonly large?: boolean
}) {
  const Arrow = direction === "back" ? RotateCcw : RotateCw
  return (
    <span aria-hidden="true" className="relative grid place-items-center">
      <Arrow className={large ? "size-10" : "size-8"} strokeWidth={large ? 1.5 : 1.75} />
      {/* Part of the glyph, sized with it in px; 11 px at least (WTYPE-01). */}
      <span
        className={`absolute pt-px leading-none font-bold tabular-nums ${large ? "text-[12px]" : "text-[11px]"}`}
      >
        {seconds}
      </span>
    </span>
  )
}
