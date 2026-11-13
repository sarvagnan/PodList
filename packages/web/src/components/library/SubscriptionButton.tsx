import { Check } from "lucide-react"
import { useEffect, useRef, useState } from "react"

// Matches Android's default two-tap window. No server action until the second activation.
const armMillis = 5000

export function SubscriptionButton({
  title,
  subscribed,
  busy,
  onSubscribe,
  onUnsubscribe
}: {
  readonly title: string
  readonly subscribed: boolean
  readonly busy: boolean
  readonly onSubscribe: () => void
  readonly onUnsubscribe: () => void
}) {
  const button = useRef<HTMLButtonElement>(null)
  const [expires, setExpires] = useState(0)
  const armed = expires > 0 && subscribed && !busy
  useEffect(() => {
    if (!armed) {
      setExpires(0)
      return
    }
    const disarm = () => setExpires(0)
    const elsewhere = (event: Event) => {
      if (!(event.target instanceof Node) || !button.current?.contains(event.target)) disarm()
    }
    const keydown = (event: KeyboardEvent) => {
      if (
        event.target !== button.current ||
        (event.key !== "Enter" && event.key !== " ") ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        disarm()
    }
    const timer = setTimeout(disarm, Math.max(0, expires - Date.now()))
    document.addEventListener("pointerdown", elsewhere, true)
    document.addEventListener("click", elsewhere, true)
    document.addEventListener("focusin", elsewhere, true)
    document.addEventListener("keydown", keydown, true)
    document.addEventListener("scroll", disarm, true)
    window.addEventListener("blur", disarm)
    window.addEventListener("popstate", disarm)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("pointerdown", elsewhere, true)
      document.removeEventListener("click", elsewhere, true)
      document.removeEventListener("focusin", elsewhere, true)
      document.removeEventListener("keydown", keydown, true)
      document.removeEventListener("scroll", disarm, true)
      window.removeEventListener("blur", disarm)
      window.removeEventListener("popstate", disarm)
    }
  }, [armed, expires])
  return (
    <>
      <button
        ref={button}
        type="button"
        data-subscription-control=""
        aria-label={
          armed ? "Unsubscribe" : `${subscribed ? "Subscribed to" : "Subscribe to"} ${title}`
        }
        aria-disabled={busy}
        onBlur={() => setExpires(0)}
        onClick={() => {
          if (busy) return
          if (!subscribed) return onSubscribe()
          if (!armed || Date.now() >= expires) {
            setExpires(Date.now() + armMillis)
            return
          }
          setExpires(0)
          onUnsubscribe()
        }}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-row font-medium hover:bg-secondary aria-disabled:opacity-60 forced-colors:border-[ButtonText] ${armed ? "border-destructive text-destructive" : "border-transparent text-primary"}`}
      >
        {busy ? (
          "Saving…"
        ) : armed ? (
          "Unsubscribe"
        ) : subscribed ? (
          <>
            <Check aria-hidden="true" className="size-4 text-positive" />
            Subscribed
          </>
        ) : (
          "Subscribe"
        )}
      </button>
      <span role="status" className="sr-only">
        {armed
          ? `Unsubscribe from ${title} armed. Activate again within five seconds to unsubscribe.`
          : ""}
      </span>
    </>
  )
}
