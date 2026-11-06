import { Config } from "effect"

/** Server settings, read from the environment. */
export const ServerConfig = Config.all({
  port: Config.Int("PORT").pipe(Config.withDefault(8787)),
  databasePath: Config.String("DATABASE_PATH").pipe(Config.withDefault("data/podlist.db")),
  /** The built web app (packages/web/dist); when unset, only the API is served. */
  webRoot: Config.option(Config.String("WEB_ROOT"))
})
