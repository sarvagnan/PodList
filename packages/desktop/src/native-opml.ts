import { constants } from "node:fs"
import { open } from "node:fs/promises"
import { basename, extname, isAbsolute } from "node:path"
import { fileURLToPath } from "node:url"

export const opmlByteLimit = 8 * 1024 * 1024
export type OpenedOpml =
  | { readonly name: string; readonly contents: string }
  | { readonly name: string; readonly error: string }

export function opmlPath(input: string): string | null {
  try {
    const path = input.startsWith("file:") ? fileURLToPath(input) : input
    return isAbsolute(path) && extname(path).toLowerCase() === ".opml" ? path : null
  } catch {
    return null
  }
}

export async function readOpmlFile(path: string, limit = opmlByteLimit): Promise<OpenedOpml> {
  const name = basename(path)
  try {
    const handle = await open(path, constants.O_RDONLY | constants.O_NONBLOCK)
    try {
      const stat = await handle.stat()
      if (!stat.isFile()) return { name, error: "Choose a regular OPML file." }
      if (stat.size > limit) return { name, error: "Choose OPML files totalling at most 8 MiB." }
      const buffer = Buffer.alloc(Math.min(stat.size + 1, limit + 1))
      let bytesRead = 0
      while (bytesRead < buffer.length) {
        const part = await handle.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead)
        if (!part.bytesRead) break
        bytesRead += part.bytesRead
      }
      if (bytesRead !== stat.size || (await handle.stat()).mtimeMs !== stat.mtimeMs)
        return { name, error: "This file changed while PodList was reading it. Try again." }
      return {
        name,
        contents: new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, bytesRead))
      }
    } finally {
      await handle.close()
    }
  } catch {
    return { name, error: "Could not read this OPML file. Choose a readable UTF-8 file." }
  }
}
