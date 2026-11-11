import { useAtomSet } from "@effect/atom-react"
import { Exit } from "effect"
import { useState } from "react"
import { exportOpmlAtom } from "../../app/library.ts"

export function ExportOpml() {
  const run = useAtomSet(exportOpmlAtom, { mode: "promiseExit" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        className="mt-3 min-h-10 rounded-full bg-secondary px-4"
        onClick={async () => {
          setBusy(true)
          setError(false)
          const exit = await run()
          setBusy(false)
          if (Exit.isFailure(exit)) {
            setError(true)
            return
          }
          const url = URL.createObjectURL(new Blob([exit.value], { type: "text/x-opml" }))
          const link = document.createElement("a")
          link.href = url
          link.download = "PodList.opml"
          link.click()
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        }}
      >
        {busy ? "Exporting…" : "Export OPML"}
      </button>
      {error && (
        <p role="alert">Could not export your Library. Check your connection and try again.</p>
      )}
    </div>
  )
}
