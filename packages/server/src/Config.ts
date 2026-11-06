import { Config } from "effect"

/** Server settings, read from the environment. */
export const ServerConfig = Config.all({
  port: Config.Int("PORT").pipe(Config.withDefault(8787)),
  databasePath: Config.String("DATABASE_PATH").pipe(Config.withDefault("data/podlist.db"))
})
