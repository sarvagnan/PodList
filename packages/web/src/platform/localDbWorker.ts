/// <reference lib="webworker" />
// The SQLite worker: owns the OPFS database file named by the Worker's name.
import * as OpfsWorker from "@effect/sql-sqlite-wasm/OpfsWorker"
import { Effect } from "effect"

declare const self: DedicatedWorkerGlobalScope

Effect.runFork(OpfsWorker.run({ port: self, dbName: self.name || "podlist.db" }))
