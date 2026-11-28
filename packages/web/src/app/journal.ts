import { useAtomSet } from "@effect/atom-react"
import { Operation } from "@podlist/domain"
import { Schema } from "effect"
import { useCallback, useEffect } from "react"
import { localClient } from "#client"
import { deferredWrite } from "../lib/deferredWrite.ts"
import { recordAtom } from "./runtime.ts"

// Typed edits are kept in an in-memory journal while SQLite acknowledges them.
// Flush pending edits before normal page exit, with a periodic durable copy if
// SQLite is slow. Replaying a name or a View twice is harmless.
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

let pending: Entry[] | undefined
const storage = deferredWrite(write)
const getEntries = () => pending ?? read()
const setEntries = (entries: Entry[]) => {
  pending = entries
  storage.set(entries)
}

/** Records a change, holding it in the journal until it has been. */
export function useJournaledRecord() {
  const record = useAtomSet(recordAtom, { mode: "promise" })
  return useCallback(
    (change: Operation.Change) => {
      if (!localClient) return record(change)
      const id = crypto.randomUUID()
      setEntries([...getEntries(), { id, change: encode(change) }])
      return record(change).finally(() => setEntries(getEntries().filter((e) => e.id !== id)))
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
    window.addEventListener("beforeunload", storage.flush)
    window.addEventListener("pagehide", storage.flush)
    // Only replay once for this renderer, including React's effect remount in development.
    if (pending === undefined) {
      const left = read()
      pending = left
      void (async () => {
        for (const entry of left) {
          try {
            await record(decode(entry.change))
          } catch {
            // A change that no longer applies (its Playlist gone) is dropped.
          } finally {
            setEntries(getEntries().filter((current) => current.id !== entry.id))
          }
        }
      })()
    }
    return () => {
      window.removeEventListener("beforeunload", storage.flush)
      window.removeEventListener("pagehide", storage.flush)
      storage.flush()
    }
  }, [record])
}
