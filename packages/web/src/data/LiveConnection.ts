export interface Cursors {
  readonly state: number
  readonly library: number
}
/** A socket per tab. Its first message catches up missed cursors. Poll while
 * disconnected, retry sockets, and stop every timer and listener on disposal. */
export class LiveConnection {
  private socket: WebSocket | undefined
  private stopped = false
  private connected = false
  private pollInFlight = false
  private pollCatchup = true
  private pollTimer: ReturnType<typeof setTimeout> | undefined
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private heartbeat: ReturnType<typeof setTimeout> | undefined
  private readonly origin: string
  private readonly cursors: () => Cursors
  private readonly notify: (cursors: Cursors, reset: boolean, connected: boolean) => void
  private readonly poll: () => Promise<Cursors>
  private readonly failed: (error: unknown) => void
  constructor(
    origin: string,
    cursors: () => Cursors,
    notify: (cursors: Cursors, reset: boolean, connected: boolean) => void,
    poll: () => Promise<Cursors>,
    failed: (error: unknown) => void
  ) {
    this.origin = origin
    this.cursors = cursors
    this.notify = notify
    this.poll = poll
    this.failed = failed
  }
  start() {
    this.connect()
  }
  stop() {
    this.stopped = true
    clearTimeout(this.pollTimer)
    clearTimeout(this.reconnectTimer)
    clearTimeout(this.heartbeat)
    this.socket?.close()
  }
  private connect() {
    if (this.stopped) return
    const url = new URL("/api/live", this.origin)
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
    const cursors = this.cursors()
    url.search = new URLSearchParams({
      state: String(cursors.state),
      library: String(cursors.library)
    }).toString()
    let first = true
    try {
      const socket = new WebSocket(url)
      this.socket = socket
      const armHeartbeat = (timeout = 35_000) => {
        clearTimeout(this.heartbeat)
        this.heartbeat = setTimeout(() => socket.close(), timeout)
      }
      // Also detect a connection that never finishes opening.
      armHeartbeat(5_000)
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (
            !Number.isSafeInteger(message.state) ||
            message.state < 0 ||
            !Number.isSafeInteger(message.library) ||
            message.library < 0 ||
            typeof message.reset !== "boolean"
          )
            throw new Error("Invalid live notification")
          this.connected = true
          armHeartbeat()
          clearTimeout(this.pollTimer)
          this.notify(message, message.reset, first)
          first = false
        } catch {
          socket.close()
        }
      }
      socket.onerror = () => socket.close()
      socket.onclose = () => {
        clearTimeout(this.heartbeat)
        if (this.stopped) return
        this.connected = false
        this.pollCatchup = true
        this.pollOnce()
        this.reconnectTimer = setTimeout(() => this.connect(), 10_000)
      }
    } catch {
      this.pollOnce()
      this.reconnectTimer = setTimeout(() => this.connect(), 10_000)
    }
  }
  private pollOnce() {
    if (this.stopped || this.connected || this.pollInFlight) return
    this.pollInFlight = true
    clearTimeout(this.pollTimer)
    void this.poll()
      .then((cursors) => {
        if (!this.stopped && !this.connected) {
          this.notify(cursors, false, this.pollCatchup)
          this.pollCatchup = false
        }
      })
      .catch((error) => {
        if (!this.stopped && !this.connected) this.failed(error)
      })
      .finally(() => {
        this.pollInFlight = false
        if (!this.stopped && !this.connected)
          this.pollTimer = setTimeout(() => this.pollOnce(), 5_000)
      })
  }
}
