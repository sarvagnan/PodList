import { Config } from "effect"

/** Server settings, read from the environment. */
export const ServerConfig = Config.all({
  port: Config.Int("PORT").pipe(Config.withDefault(8787)),
  /** The address to listen on; every interface when unset. Deployed: 127.0.0.1, behind Tailscale Serve. */
  host: Config.option(Config.String("HOST")),
  databasePath: Config.String("DATABASE_PATH").pipe(Config.withDefault("data/podlist.db")),
  /** The built web app (packages/web/dist); when unset, only the API is served. */
  webRoot: Config.option(Config.String("WEB_ROOT")),
  /** Resized artwork cache; defaults to an "artwork" folder beside the database. */
  artworkDir: Config.option(Config.String("ARTWORK_DIR"))
})
