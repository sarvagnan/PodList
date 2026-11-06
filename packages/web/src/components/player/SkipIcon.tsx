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
      <Arrow className={large ? "size-10" : "size-7"} strokeWidth={large ? 1.5 : 1.75} />
      <span
        className={`absolute pt-px leading-none font-bold tabular-nums ${large ? "text-xs" : "text-[0.5625rem]"}`}
      >
        {seconds}
      </span>
    </span>
  )
}
