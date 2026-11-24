// Relays expose the guest server to Mac loopback (TCP) and host loopback (tartExec).
// A gate file cuts existing streams as well as new ones. The demo stays alive.
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { connect, createServer } from "node:net"
import { Duplex } from "node:stream"
import { pathToFileURL } from "node:url"

// macOS Local Network privacy blocks host processes from opening TCP connections to
// the Tart guest's IP. Tunnel each connection over the guest agent instead.
export const tartExec = (vm, guestPort) => () => {
  const child = spawn("tart", ["exec", "-i", vm, "/usr/bin/nc", "127.0.0.1", String(guestPort)], {
    stdio: ["pipe", "pipe", "ignore"]
  })
  const stream = Duplex.from({ readable: child.stdout, writable: child.stdin })
  const kill = () => child.kill()
  stream.on("close", kill)
  child.on("exit", () => stream.destroy())
  return stream
}

export function relay(port, destination, offlineFile) {
  const pairs = new Set()
  const server = createServer((local) => {
    if (existsSync(offlineFile)) {
      local.destroy()
      return
    }
    const remote = typeof destination === "function" ? destination() : connect(port, destination)
    const disconnect = () => {
      local.destroy()
      remote.destroy()
    }
    for (const socket of [local, remote]) {
      socket.on("error", disconnect)
      socket.on("close", disconnect)
    }
    pairs.add(disconnect)
    local.on("close", () => pairs.delete(disconnect))
    local.pipe(remote).pipe(local)
  })
  const gate = setInterval(() => {
    if (existsSync(offlineFile)) for (const disconnect of pairs) disconnect()
  }, 100)
  let stopped = false
  return {
    ready: new Promise((resolve, reject) => {
      server.once("error", reject)
      server.listen(port, "127.0.0.1", resolve)
    }),
    stop: () => {
      if (stopped) return
      stopped = true
      clearInterval(gate)
      for (const disconnect of pairs) disconnect()
      server.close()
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [port, destination, offlineFile] = process.argv.slice(2)
  const listener = relay(Number(port), destination, offlineFile)
  await listener.ready
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, listener.stop)
}
