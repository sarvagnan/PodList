import { NodeWS } from "@effect/platform-node"

export const liveLimits = {
  total: 64,
  profile: 8,
  peer: 32,
  maxPayload: 1024,
  bufferedBytes: 16 * 1024,
  sendTimeoutMs: 5000,
  heartbeatMs: 15000
} as const
export type SocketLimits = Pick<
  typeof liveLimits,
  "bufferedBytes" | "sendTimeoutMs" | "heartbeatMs"
>

/** Enforce limits at the actual Node transport, below Effect's immediate writer. */
export const guardSocket = (
  socket: NodeWS.WebSocket,
  limits: { [K in keyof SocketLimits]: number } = liveLimits
) => {
  const send = socket.send.bind(socket)
  let pending = 0
  let deadline: ReturnType<typeof setTimeout> | undefined
  let alive = true
  let closing: ReturnType<typeof setTimeout> | undefined
  const stop = () => {
    if (deadline) clearTimeout(deadline)
    if (closing) clearTimeout(closing)
    clearInterval(heartbeat)
  }
  // No application messages are part of this notification-only protocol.
  const closeSoon = () => {
    closing ??= setTimeout(() => socket.terminate(), 1000)
    closing.unref()
  }
  socket.on("message", () => {
    socket.close(1008, "Client messages are not supported")
    closeSoon()
  })
  socket.on("pong", () => {
    alive = true
  })
  const heartbeat = setInterval(() => {
    if (socket.readyState !== NodeWS.WebSocket.OPEN) return
    if (!alive) {
      socket.terminate()
      return
    }
    alive = false
    socket.ping()
  }, limits.heartbeatMs)
  heartbeat.unref()
  socket.once("close", stop)
  socket.on("error", closeSoon)
  socket.send = (
    data,
    optionsOrCallback?: Parameters<NodeWS.WebSocket["send"]>[1] | ((error?: Error) => void),
    callback?: (error?: Error) => void
  ) => {
    const bytes =
      typeof data === "string"
        ? Buffer.byteLength(data)
        : data instanceof ArrayBuffer
          ? data.byteLength
          : ArrayBuffer.isView(data)
            ? data.byteLength
            : Buffer.byteLength(String(data))
    if (socket.bufferedAmount + bytes > limits.bufferedBytes) {
      socket.terminate()
      return
    }
    pending++
    // One deadline for the oldest outstanding write. New writes cannot extend it.
    deadline ??= setTimeout(() => socket.terminate(), limits.sendTimeoutMs)
    deadline.unref()
    const done = (error?: Error) => {
      pending--
      if (pending === 0) {
        clearTimeout(deadline)
        deadline = undefined
      }
      if (error) socket.terminate()
      const cb = typeof optionsOrCallback === "function" ? optionsOrCallback : callback
      cb?.(error)
    }
    if (typeof optionsOrCallback === "object") send(data, optionsOrCallback, done)
    else send(data, done)
  }
}

export const liveWebSocketOptions = (
  limits: { [K in keyof SocketLimits]: number } = liveLimits
): NonNullable<import("@effect/platform-node/NodeHttpServer").Options["websocket"]> => ({
  maxPayload: liveLimits.maxPayload,
  perMessageDeflate: false,
  // Preserve ws's private server-constructor arguments as well as its public overloads.
  WebSocket: new Proxy(NodeWS.WebSocket, {
    construct(Base, args) {
      const socket = Reflect.construct(Base, args) as NodeWS.WebSocket
      guardSocket(socket, limits)
      return socket
    }
  })
})
