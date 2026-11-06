import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

// Placeholder entry point. The HTTP/RPC skeleton, config and SQLite land with pod-rxi.1.
const program = Effect.log("PodList server: scaffold only")

NodeRuntime.runMain(program)
