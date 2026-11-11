import { afterEach, describe, expect, it, vi } from "vitest"
import { LiveConnection } from "./LiveConnection.ts"

class Socket {
  static opened: Array<Socket> = []
  readonly url: string
  onmessage?: (event: { data: string }) => void
  onclose?: () => void
  onerror?: () => void
  constructor(url: string) {
    this.url = String(url)
    Socket.opened.push(this)
  }
  close() {
    this.onclose?.()
  }
  message(state: number, library: number, reset = false) {
    this.onmessage?.({ data: JSON.stringify({ state, library, reset }) })
  }
}
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  Socket.opened = []
})
describe("live cursor connection", () => {
  it("uses a same-origin socket with catch-up cursors and forwards reset on reconnect", async () => {
    vi.useFakeTimers()
    vi.stubGlobal("WebSocket", Socket)
    const notify = vi.fn()
    const cursors = { state: 5, library: 7 }
    const live = new LiveConnection(
      "https://pod.test",
      () => cursors,
      notify,
      async () => cursors,
      vi.fn()
    )
    live.start()
    expect(Socket.opened[0]?.url).toBe("wss://pod.test/api/live?state=5&library=7")
    Socket.opened[0]?.message(8, 9)
    expect(notify).toHaveBeenLastCalledWith({ state: 8, library: 9, reset: false }, false, true)
    cursors.state = 8
    cursors.library = 9
    Socket.opened[0]?.close()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(Socket.opened[1]?.url).toContain("state=8&library=9")
    Socket.opened[1]?.message(0, 0, true)
    expect(notify).toHaveBeenLastCalledWith({ state: 0, library: 0, reset: true }, true, true)
    live.stop()
    const count = notify.mock.calls.length
    await vi.advanceTimersByTimeAsync(60_000)
    expect(notify).toHaveBeenCalledTimes(count)
    expect(Socket.opened).toHaveLength(2)
  })
  it("polls when connection fails and reports a polling failure", async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      "WebSocket",
      class {
        constructor() {
          throw new Error("blocked")
        }
      }
    )
    const notify = vi.fn()
    const failure = vi.fn()
    const poll = vi
      .fn()
      .mockResolvedValueOnce({ state: 2, library: 3 })
      .mockRejectedValue(new Error("offline"))
    const live = new LiveConnection(
      "https://pod.test",
      () => ({ state: 0, library: 0 }),
      notify,
      poll,
      failure
    )
    live.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(notify).toHaveBeenCalledWith({ state: 2, library: 3 }, false, true)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(failure).toHaveBeenCalledWith(expect.objectContaining({ message: "offline" }))
    live.stop()
  })
})
