import { Layer, ManagedRuntime, Schema } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as LocalDb from "../platform/LocalDb.ts"
import { readBringOverSource, SourceSnapshot } from "./BringOverSnapshot.ts"

const files = async () => (await navigator.storage.getDirectory()).getDirectoryHandle("downloads")
const audio = async (id: string) => {
  const directory = await files()
  return (await directory.getFileHandle(`${encodeURIComponent(id)}.audio`)).getFile()
}

export const snapshot = async () => {
  const runtime = ManagedRuntime.make(
    LocalDb.layerWeb("podlist.db", true).pipe(Layer.provide(Reactivity.layer))
  )
  try {
    const source = await runtime.runPromise(readBringOverSource)
    return source && Schema.encodeSync(SourceSnapshot)(source)
  } finally {
    await runtime.dispose()
  }
}

export const audioInfo = async (id: string) => {
  const file = await audio(id)
  const type = await files()
    .then((dir) => dir.getFileHandle(`${encodeURIComponent(id)}.type`))
    .then((handle) => handle.getFile())
    .then((file) => file.text())
    .catch(() => "")
  return { bytes: file.size, type: type.startsWith("audio/") ? type : "application/octet-stream" }
}

export const audioChunk = async (id: string, offset: number, length: number) => {
  const file = await audio(id)
  return file.slice(offset, offset + length).arrayBuffer()
}
