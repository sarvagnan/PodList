import { Toast } from "@base-ui/react/toast"
import { useAtomSet } from "@effect/atom-react"
import { useCallback } from "react"
import { episodeActionAtom, undoAtom } from "../../app/episodeActions.ts"
import type { EpisodeAction } from "../../lib/episodeActions.ts"

/** Runs an Episode action, then confirms it with an Undo. Play Now confirms itself. */
export function useEpisodeActions() {
  const run = useAtomSet(episodeActionAtom, { mode: "promise" })
  const undo = useAtomSet(undoAtom)
  const toasts = Toast.useToastManager()
  return useCallback(
    async (action: EpisodeAction) => {
      const outcome = await run(action)
      if (action._tag === "PlayNow") return
      toasts.add({
        description: outcome.message,
        timeout: 6000,
        ...(outcome.undo.length > 0
          ? { actionProps: { children: "Undo", onClick: () => undo(outcome.undo) } }
          : {})
      })
    },
    [run, undo, toasts]
  )
}
