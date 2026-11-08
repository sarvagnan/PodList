package app.podlist.data

/** Exact shared migrations from packages/domain/src/Sql.ts, guarded against drift in tests. */
data class Migration(val id: Int, val name: String, val statements: List<String>)

object SharedSchema {
    val migrations = listOf(
        Migration(1, "library_and_state", listOf(
            """CREATE TABLE subscription (
        id TEXT PRIMARY KEY,
        feed_url TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        author TEXT,
        description TEXT,
        artwork_url TEXT,
        subscribed_at INTEGER NOT NULL,
        unsubscribed_at INTEGER,
        played_threshold REAL,
        playback_settings TEXT NOT NULL DEFAULT '{}'
      )""",
            """CREATE TABLE episode (
        id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL REFERENCES subscription (id),
        guid TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        published INTEGER NOT NULL,
        duration REAL,
        audio_url TEXT NOT NULL,
        artwork_url TEXT,
        chapters TEXT NOT NULL DEFAULT '[]',
        audio_updated_at INTEGER,
        UNIQUE (subscription_id, guid)
      )""",
            """CREATE INDEX episode_published ON episode (published DESC)""",
            """CREATE INDEX episode_subscription_published ON episode (subscription_id, published DESC)""",
            """CREATE TABLE episode_state (
        episode_id TEXT PRIMARY KEY,
        played_at INTEGER,
        played_source TEXT,
        starred INTEGER NOT NULL DEFAULT 0
      )""",
            """CREATE TABLE entry_index (
        playlist_id TEXT NOT NULL,
        episode_id TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        position REAL NOT NULL,
        PRIMARY KEY (playlist_id, episode_id)
      )""",
            """CREATE INDEX entry_index_episode ON entry_index (episode_id)""",
            """CREATE TABLE playlist (id TEXT PRIMARY KEY, doc TEXT NOT NULL)""",
            """CREATE TABLE view (id TEXT PRIMARY KEY, doc TEXT NOT NULL)""",
            """CREATE TABLE download_rule (
        subscription_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        keep_at_most INTEGER,
        PRIMARY KEY (subscription_id, device_id)
      )""",
            """CREATE TABLE setting (key TEXT PRIMARY KEY, value TEXT NOT NULL)""",
        )),
        Migration(2, "episode_chapters_source", listOf(
            """ALTER TABLE episode ADD COLUMN chapters_url TEXT""",
            """ALTER TABLE episode ADD COLUMN chapters_fetched_at INTEGER""",
        )),
        Migration(3, "list_order", listOf(
            """ALTER TABLE playlist ADD COLUMN ordinal INTEGER NOT NULL DEFAULT 0""",
            """ALTER TABLE view ADD COLUMN ordinal INTEGER NOT NULL DEFAULT 0""",
            """UPDATE playlist SET ordinal = CASE WHEN id = 'default' THEN 0
         ELSE 1 + (SELECT count(*) FROM playlist p WHERE p.id <> 'default' AND p.rowid < playlist.rowid) END""",
            """UPDATE view SET ordinal = (SELECT count(*) FROM view v WHERE v.rowid < view.rowid)""",
        )),
    )
    val clientMigrations = listOf(
        Migration(1, "outbox", listOf(
            "CREATE TABLE outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, operation TEXT NOT NULL)",
            "CREATE TABLE sync_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
        )),
        Migration(2, "download", listOf(
            "CREATE TABLE download (episode_id TEXT PRIMARY KEY, manual INTEGER NOT NULL, bytes INTEGER NOT NULL, saved_at INTEGER NOT NULL)"
        ))
    )
}
