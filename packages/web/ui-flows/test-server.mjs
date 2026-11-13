import { execFileSync } from "node:child_process"
import { startDemo } from "./demo.mjs"

execFileSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], { stdio: "inherit" })
const demo = await startDemo({ port: Number(process.argv[2]) })
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    demo.stop()
    await demo.stopped
    process.exit(0)
  })
await new Promise(() => {})
