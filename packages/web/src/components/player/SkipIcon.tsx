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
      <Arrow
        className={large ? "size-[min(2.5rem,56px)]" : "size-[min(2rem,40px)]"}
        strokeWidth={large ? 1.5 : 1.75}
      />
      {/* Grow together, bounded by the transport’s button at 200% text (WTYPE-02). */}
      <span
        className={`absolute pt-px leading-none font-bold tabular-nums ${large ? "text-[min(0.75rem,21px)]" : "text-[min(0.75rem,15px)]"}`}
      >
        {seconds}
      </span>
    </span>
  )
}
