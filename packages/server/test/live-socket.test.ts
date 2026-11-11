import { NodeWS } from "@effect/platform-node"
import { afterEach, describe, expect, it, vi } from "vitest"
import { guardSocket, liveLimits } from "../src/LiveSocket.ts"

// A transport that can deliberately stop completing writes: deterministic coverage
// of backpressure deadlines without depending on host TCP receive-buffer sizes.
const blockedTransport = (bufferedAmount = 0) => {
  const socket = Reflect.construct(NodeWS.WebSocket, [
    null,
    undefined,
    { autoPong: true }
  ]) as NodeWS.WebSocket
  Object.defineProperty(socket, "readyState", { value: NodeWS.WebSocket.OPEN })
  Object.defineProperty(socket, "bufferedAmount", { value: bufferedAmount })
  const send =
    vi.fn<
      (data: Parameters<NodeWS.WebSocket["send"]>[0], callback?: (error?: Error) => void) => void
    >()
  socket.send = send as NodeWS.WebSocket["send"]
  socket.ping = vi.fn()
  socket.terminate = vi.fn(() => {
    socket.emit("close", 1006, Buffer.alloc(0))
  })
  guardSocket(socket)
  return { socket, send }
}
afterEach(() => vi.useRealTimers())

describe("live transport backpressure", () => {
  it("includes queued bytes and the next UTF-8 frame in the outbound ceiling", () => {
    vi.useFakeTimers()
    const { socket, send } = blockedTransport(liveLimits.bufferedBytes - 1)
    socket.send("é")
    expect(send).not.toHaveBeenCalled()
    expect(socket.terminate).toHaveBeenCalledOnce()
  })

  it("allows the exact buffer boundary and disconnects an undrained write at 5 seconds", () => {
    vi.useFakeTimers()
    const { socket, send } = blockedTransport(liveLimits.bufferedBytes - 1)
    socket.send("x")
    expect(send).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(liveLimits.sendTimeoutMs - 1)
    expect(socket.terminate).not.toHaveBeenCalled()
    // Repeated writes cannot renew the oldest blocked write's deadline.
    socket.send("y")
    vi.advanceTimersByTime(1)
    expect(socket.terminate).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("clears deadlines on completed writes and all timers on peer close", () => {
    vi.useFakeTimers()
    const { socket, send } = blockedTransport()
    socket.send("notice")
    const done = send.mock.calls[0]?.[1]
    expect(typeof done).toBe("function")
    if (typeof done === "function") done()
    vi.advanceTimersByTime(liveLimits.sendTimeoutMs)
    expect(socket.terminate).not.toHaveBeenCalled()
    socket.emit("close", 1000, Buffer.alloc(0))
    expect(vi.getTimerCount()).toBe(0)
  })

  it("terminates on transport send errors", () => {
    vi.useFakeTimers()
    const { socket, send } = blockedTransport()
    socket.send("notice")
    const done = send.mock.calls[0]?.[1]
    if (typeof done === "function") done(new Error("write failed"))
    expect(socket.terminate).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
})
