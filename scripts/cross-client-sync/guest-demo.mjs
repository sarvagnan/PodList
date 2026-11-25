import { renameSync, writeFileSync } from "node:fs"
import { connect } from "node:net"
import { startDemo } from "../../packages/web/ui-flows/demo.mjs"
import { relay } from "./relay.mjs"

const [host, port, control] = process.argv.slice(2)
let stopping = false
let demo
let listener
function stop() {
  stopping = true
  listener?.stop()
  demo?.stop()
}
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, stop)

try {
  // The demo listens on guest loopback only, one port above the Mac relay; the host
  // reaches it with tart exec (see relay.mjs), never over the network.
  demo = await startDemo({ host: "127.0.0.1", port: Number(port) + 1 })
  if (!stopping) {
    // The Mac gate lives on the guest's own disk: the shared folder kept showing a
    // deleted gate file for over 30 s, so the host toggles it with tart exec.
    listener = relay(
      Number(port),
      () => connect(Number(port) + 1, "127.0.0.1"),
      "/private/tmp/podlist-cross-sync-mac-offline"
    )
    await listener.ready
    if (!stopping) {
      const ready = { fixtureFeed: `${demo.fixtures}/feeds/long-list.xml` }
      writeFileSync(`${control}/ready.tmp`, JSON.stringify(ready))
      renameSync(`${control}/ready.tmp`, `${control}/ready.json`)
      await demo.stopped
    }
  }
} finally {
  stop()
  await demo?.stopped
}
