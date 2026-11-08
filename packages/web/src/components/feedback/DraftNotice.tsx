/** Keep refused draft storage visible and recoverable beside the work (WDATA-02). */
export function DraftNotice({
  unsaved,
  retry
}: {
  readonly unsaved: boolean
  readonly retry: () => void
}) {
  if (!unsaved) return null
  return (
    <div role="status" className="mt-4 rounded-lg border border-destructive p-3 text-small">
      <p>This draft couldn’t be saved on this Device</p>
      <button
        type="button"
        onClick={retry}
        className="mt-2 min-h-11 rounded-full border border-field px-4 font-semibold hover:bg-secondary active:bg-input"
      >
        Try again
      </button>
    </div>
  )
}
