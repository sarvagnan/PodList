import { HttpApi } from "effect/http-api"
import { LibraryApi } from "./Library.ts"
import { SubscriptionsApi } from "./Subscriptions.ts"
import { SyncApi } from "./Sync.ts"
import { SystemApi } from "./System.ts"

export * as Library from "./Library.ts"
export * as Subscriptions from "./Subscriptions.ts"
export * as Sync from "./Sync.ts"
export * as System from "./System.ts"

/** Everything the server serves under /api. No login: the tailnet is the boundary (ADR 0004). */
export class PodListApi extends HttpApi.make("podlist")
  .add(SystemApi)
  .add(SyncApi)
  .add(LibraryApi)
  .add(SubscriptionsApi)
  .prefix("/api") {}
