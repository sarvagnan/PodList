// Warm the shared Node bytecode cache before workers start their isolated servers.
// This keeps repeated framework compilation out of browser concurrency/load tests.
import { flushCompileCache } from "node:module"

await import("../../server/src/main.ts")
flushCompileCache()
// Module compilation is fixture setup, before API readiness is meaningful.
if (process.send) process.send({ type: "podlist-demo-loaded" }, () => process.disconnect())
