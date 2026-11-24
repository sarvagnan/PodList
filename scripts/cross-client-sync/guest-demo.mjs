import { renameSync, writeFileSync } from "node:fs"
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
  demo = await startDemo({ host, port: Number(port) })
  if (!stopping) {
    listener = relay(Number(port), host, `${control}/mac-offline`)
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
