import { useAtomSet } from "@effect/atom-react"
import { useEffect } from "react"
import type { ObjectValue } from "../../../desktop/src/automation/handler.ts"
import { runtime } from "../app/runtime.ts"
import { useConfirm } from "../components/feedback/useConfirm.ts"
import { perform } from "./actions.ts"

const actionAtom = runtime.fn(
  (input: { name: string; args: ObjectValue }) => perform(input.name, input.args),
  { concurrent: true }
)

export function Automation() {
  const run = useAtomSet(actionAtom, { mode: "promise" })
  const confirm = useConfirm()
  useEffect(
    () =>
      window.podlistApp?.automation?.onCall(async (name, args) => {
        const result = await run({ name, args })
        if (result.outcome)
          confirm(
            result.outcome,
            async () => (await run({ name, args })).outcome ?? { message: "", undo: [] }
          )
        return result.value
      }),
    [run, confirm]
  )
  return null
}
