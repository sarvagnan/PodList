import { Effect, Layer } from "effect"
import { LocalWork } from "./LocalWork.ts"
import type { Reply, Request, WorkReply } from "./localWorkTasks.ts"

export const localWorkLayer = Layer.effect(
  LocalWork,
  Effect.gen(function* () {
    const worker = new Worker(new URL("./localDataWorker.ts", import.meta.url), {
      type: "module"
    })
    const pending = new Map<number, (reply: WorkReply) => void>()
    let sequence = 0
    let failure: string | undefined
    const fail = (message: string) => {
      failure = message
      for (const [id, resume] of pending) resume({ id, error: message })
      pending.clear()
    }
    worker.addEventListener("message", ({ data }: MessageEvent<WorkReply>) =>
      pending.get(data.id)?.(data)
    )
    worker.addEventListener("error", (event) => fail(event.message || "Local worker failed"))
    worker.addEventListener("messageerror", () => fail("Could not read a local worker reply"))
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        worker.terminate()
        fail("Local worker closed")
      })
    )
    return LocalWork.of({
      run: <R extends Request>(request: R) =>
        Effect.callback<Reply[R["task"]], Error>((resume) => {
          if (failure !== undefined) return resume(Effect.fail(new Error(failure)))
          const id = ++sequence
          pending.set(id, (reply) => {
            pending.delete(id)
            resume(
              "error" in reply
                ? Effect.fail(new Error(reply.error))
                : Effect.succeed(reply.result as Reply[R["task"]])
            )
          })
          try {
            worker.postMessage({ id, request })
          } catch (error) {
            pending.delete(id)
            return resume(Effect.fail(error instanceof Error ? error : new Error(String(error))))
          }
          return Effect.sync(() => {
            pending.delete(id)
          })
        })
    })
  })
)
