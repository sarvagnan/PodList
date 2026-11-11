import { useAtomSet } from "@effect/atom-react"
import { Operation } from "@podlist/domain"
import { Schema } from "effect"
import { useCallback, useEffect } from "react"
import { localClient } from "#client"
import { recordAtom } from "./runtime.ts"

// Typed edits (a name, a View's words) are kept in browser storage, synchronously, the
// moment they're made, until the local database has them (DATA-01): closing or
// reloading the page in the instant between can't lose them. What's left on the next
// start is recorded then. Each is a whole value (a name, a View), so recording one twice
// is harmless.

const key = "podlist:journal"
const encode = Schema.encodeSync(Operation.Change)
const decode = Schema.decodeUnknownSync(Operation.Change)

type Entry = { readonly id: string; readonly change: unknown }
const read = (): Array<Entry> => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as Array<Entry>
  } catch {
    return []
  }
}
const write = (entries: ReadonlyArray<Entry>) => {
  try {
    if (entries.length === 0) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(entries))
  } catch {
    // Storage refused: the edit is still recorded the usual way.
  }
}

/** Records a change, holding it in the journal until it has been. */
export function useJournaledRecord() {
  const record = useAtomSet(recordAtom, { mode: "promise" })
  return useCallback(
    (change: Operation.Change) => {
      if (!localClient) return record(change)
      const id = crypto.randomUUID()
      write([...read(), { id, change: encode(change) }])
      return record(change).finally(() => write(read().filter((e) => e.id !== id)))
    },
    [record]
  )
}

/** On start: records whatever the last page closed before it could. */
export function useReplayJournal() {
  const record = useAtomSet(recordAtom, { mode: "promise" })
  useEffect(() => {
    if (!localClient) {
      localStorage.removeItem(key)
      return
    }
    const left = read()
    if (left.length === 0) return
    write([])
    void (async () => {
      for (const entry of left) {
        try {
          await record(decode(entry.change))
        } catch {
          // A change that no longer applies (its Playlist gone) is dropped.
        }
      }
    })()
  }, [record])
}
