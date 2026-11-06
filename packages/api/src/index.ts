import { HttpApi } from "effect/http-api"
import { SystemApi } from "./System.ts"

export * as System from "./System.ts"

/** Everything the server serves under /api. No login: the tailnet is the boundary (ADR 0004). */
export class PodListApi extends HttpApi.make("podlist").add(SystemApi).prefix("/api") {}
