import { BrowserWindow } from "electron"

const chunkSize = 256 * 1024

/** Open quiet, isolated access to OPFS and SQLite in the Standalone Chromium partition. */
export class BringOverSource {
  private window: BrowserWindow | undefined
  private loading: Promise<BrowserWindow> | undefined
  private readingSnapshot: Promise<unknown> | undefined

  private readonly origin: string
  private readonly partition: () => string
  private readonly preload: string

  constructor(origin: string, partition: () => string, preload: string) {
    this.origin = origin
    this.partition = partition
    this.preload = preload
  }

  private load() {
    if (this.loading) return this.loading
    if (this.window && !this.window.isDestroyed()) return Promise.resolve(this.window)
    const source = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: this.partition(),
        preload: this.preload,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        backgroundThrottling: false,
        additionalArguments: ["--podlist-bring-over-source"]
      }
    })
    this.window = source
    source.webContents.on("will-navigate", (event) => event.preventDefault())
    source.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
    this.loading = source
      .loadURL(`${this.origin}/`)
      .then(() => source)
      .catch((error) => {
        if (!source.isDestroyed()) source.destroy()
        throw error
      })
      .finally(() => {
        this.loading = undefined
      })
    return this.loading
  }

  private async ask<T>(
    method: "snapshot" | "audioInfo" | "audioChunk",
    ...args: unknown[]
  ): Promise<T> {
    const source = await this.load()
    return (await source.webContents.executeJavaScript(
      `globalThis.podlistBringOverSource.${method}(...${JSON.stringify(args)})`
    )) as T
  }

  snapshot() {
    this.readingSnapshot ??= this.ask("snapshot").finally(() => {
      this.readingSnapshot = undefined
    })
    return this.readingSnapshot
  }

  close() {
    if (this.window && !this.window.isDestroyed()) this.window.destroy()
    this.window = undefined
  }

  async audio(id: string, signal: AbortSignal): Promise<Response> {
    const { bytes, type } = await this.ask<{ bytes: number; type: string }>("audioInfo", id)
    let offset = 0
    const body = new ReadableStream<Uint8Array<ArrayBuffer>>({
      pull: async (controller) => {
        if (signal.aborted) {
          controller.error(signal.reason)
          return
        }
        if (offset >= bytes) {
          controller.close()
          return
        }
        const length = Math.min(chunkSize, bytes - offset)
        const raw = await this.ask<ArrayBuffer>("audioChunk", id, offset, length)
        if (raw.byteLength !== length)
          throw new Error("The source download changed during transfer.")
        offset += length
        controller.enqueue(new Uint8Array(raw))
      }
    })
    return new Response(body, {
      headers: {
        "content-type": type,
        "content-length": String(bytes),
        "content-security-policy": "default-src 'none'; sandbox",
        "x-content-type-options": "nosniff"
      }
    })
  }
}
