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
      <Arrow className={large ? "size-[2.5rem]" : "size-[2rem]"} strokeWidth={large ? 1.5 : 1.75} />
      {/* The numerals and arrow scale with text, with a 12 px minimum at default size (WTYPE-01). */}
      <span className="absolute pt-px text-[0.75rem] leading-none font-bold tabular-nums">
        {seconds}
      </span>
    </span>
  )
}
