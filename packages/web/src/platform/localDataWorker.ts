/// <reference lib="webworker" />
import { execute, type Request, type WorkReply } from "./localWorkTasks.ts"

declare const self: DedicatedWorkerGlobalScope

self.addEventListener("message", ({ data }: MessageEvent<{ id: number; request: Request }>) => {
  const { id, request } = data
  let reply: WorkReply
  try {
    reply = { id, result: execute(request) }
  } catch (error) {
    reply = { id, error: error instanceof Error ? error.message : String(error) }
  }
  self.postMessage(reply)
})
