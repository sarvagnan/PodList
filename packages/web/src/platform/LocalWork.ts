import { Context, type Effect } from "effect"
import type { Reply, Request } from "./localWorkTasks.ts"

export class LocalWork extends Context.Service<
  LocalWork,
  {
    readonly run: <R extends Request>(request: R) => Effect.Effect<Reply[R["task"]], Error>
  }
>()("@podlist/web/LocalWork") {}
