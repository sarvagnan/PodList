// Mirrors Android SharedSchema.kt and the shared Sql.ts migrations. Guarded by tests.
public struct Migration: Sendable {
    public let id: Int
    public let name: String
    public let statements: [String]
}

public enum SharedSchema {
    public static let migrations: [Migration] = [
        Migration(id: 1, name: "library_and_state", statements: [
            "CREATE TABLE subscription (\n        id TEXT PRIMARY KEY,\n        feed_url TEXT NOT NULL UNIQUE,\n        title TEXT NOT NULL,\n        author TEXT,\n        description TEXT,\n        artwork_url TEXT,\n        subscribed_at INTEGER NOT NULL,\n        unsubscribed_at INTEGER,\n        played_threshold REAL,\n        playback_settings TEXT NOT NULL DEFAULT '{}'\n      )",
            "CREATE TABLE episode (\n        id TEXT PRIMARY KEY,\n        subscription_id TEXT NOT NULL REFERENCES subscription (id),\n        guid TEXT NOT NULL,\n        title TEXT NOT NULL,\n        description TEXT NOT NULL,\n        published INTEGER NOT NULL,\n        duration REAL,\n        audio_url TEXT NOT NULL,\n        artwork_url TEXT,\n        chapters TEXT NOT NULL DEFAULT '[]',\n        audio_updated_at INTEGER,\n        UNIQUE (subscription_id, guid)\n      )",
            "CREATE INDEX episode_published ON episode (published DESC)",
            "CREATE INDEX episode_subscription_published ON episode (subscription_id, published DESC)",
            "CREATE TABLE episode_state (\n        episode_id TEXT PRIMARY KEY,\n        played_at INTEGER,\n        played_source TEXT,\n        starred INTEGER NOT NULL DEFAULT 0\n      )",
            "CREATE TABLE entry_index (\n        playlist_id TEXT NOT NULL,\n        episode_id TEXT NOT NULL,\n        ordinal INTEGER NOT NULL,\n        position REAL NOT NULL,\n        PRIMARY KEY (playlist_id, episode_id)\n      )",
            "CREATE INDEX entry_index_episode ON entry_index (episode_id)",
            "CREATE TABLE playlist (id TEXT PRIMARY KEY, doc TEXT NOT NULL)",
            "CREATE TABLE view (id TEXT PRIMARY KEY, doc TEXT NOT NULL)",
            "CREATE TABLE download_rule (\n        subscription_id TEXT NOT NULL,\n        device_id TEXT NOT NULL,\n        mode TEXT NOT NULL,\n        keep_at_most INTEGER,\n        PRIMARY KEY (subscription_id, device_id)\n      )",
            "CREATE TABLE setting (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
        ]),
        Migration(id: 2, name: "episode_chapters_source", statements: [
            "ALTER TABLE episode ADD COLUMN chapters_url TEXT",
            "ALTER TABLE episode ADD COLUMN chapters_fetched_at INTEGER",
        ]),
        Migration(id: 3, name: "list_order", statements: [
            "ALTER TABLE playlist ADD COLUMN ordinal INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE view ADD COLUMN ordinal INTEGER NOT NULL DEFAULT 0",
            "UPDATE playlist SET ordinal = CASE WHEN id = 'default' THEN 0\n         ELSE 1 + (SELECT count(*) FROM playlist p WHERE p.id <> 'default' AND p.rowid < playlist.rowid) END",
            "UPDATE view SET ordinal = (SELECT count(*) FROM view v WHERE v.rowid < view.rowid)",
        ]),
        Migration(id: 4, name: "mentions_and_rule_since", statements: [
            "ALTER TABLE subscription ADD COLUMN title_folded TEXT NOT NULL DEFAULT ''",
            "ALTER TABLE episode ADD COLUMN title_folded TEXT NOT NULL DEFAULT ''",
            "ALTER TABLE episode ADD COLUMN description_folded TEXT NOT NULL DEFAULT ''",
            "ALTER TABLE download_rule ADD COLUMN since INTEGER",
        ]),
    ]
    public static let clientMigrations: [Migration] = [
        Migration(id: 1, name: "outbox", statements: [
            "CREATE TABLE outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, operation TEXT NOT NULL)",
            "CREATE TABLE sync_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
        ]),
        Migration(id: 2, name: "download", statements: [
            "CREATE TABLE download (episode_id TEXT PRIMARY KEY, manual INTEGER NOT NULL, bytes INTEGER NOT NULL, saved_at INTEGER NOT NULL)",
        ]),
    ]
    public static let platformMigrations: [Migration] = [
        Migration(id: 1, name: "publisher_links", statements: [
            "ALTER TABLE subscription ADD COLUMN website_url TEXT",
            "ALTER TABLE episode ADD COLUMN website_url TEXT",
        ]),
    ]
    public static let deviceMigrations: [Migration] = [
        Migration(id: 1, name: "device_feeds", statements: [
            "CREATE TABLE feed_state (subscription_id TEXT PRIMARY KEY REFERENCES subscription(id), etag TEXT, last_modified TEXT, checked_at INTEGER, failures INTEGER NOT NULL DEFAULT 0, last_error TEXT)",
            "CREATE TABLE local_operation (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, operation TEXT NOT NULL)",
        ]),
    ]
}
