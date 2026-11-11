import type { RefObject } from "react"
export function ListContinuation({
  more,
  loading,
  error,
  loadMore,
  sentinel
}: {
  readonly more: boolean
  readonly loading: boolean
  readonly error: boolean
  readonly loadMore: () => void
  readonly sentinel: RefObject<HTMLDivElement | null>
}) {
  if (!more) return null
  return (
    <div ref={sentinel} className="px-6 py-4">
      <button
        type="button"
        onClick={loadMore}
        disabled={loading}
        className="rounded-full bg-secondary px-4 py-2 text-row"
      >
        {loading ? "Loading…" : error ? "Retry loading more" : "Load more"}
      </button>
    </div>
  )
}
