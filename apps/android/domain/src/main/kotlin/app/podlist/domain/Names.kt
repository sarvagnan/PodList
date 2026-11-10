package app.podlist.domain

/** Validate deliberate local naming; replay keeps duplicates received from another Device. */
object Names {
    enum class Problem { Empty, Duplicate }

    fun validate(name: String, taken: Iterable<String>): Problem? = when {
        name.trim().isEmpty() -> Problem.Empty
        taken.any { it.trim().equals(name.trim(), ignoreCase = true) } -> Problem.Duplicate
        else -> null
    }

    fun nextFreeName(base: String, taken: Iterable<String>): String {
        val name = base.trim()
        val names = taken.toList()
        if (validate(name, names) != Problem.Duplicate) return name
        var suffix = 2
        while (validate("$name $suffix", names) == Problem.Duplicate) suffix++
        return "$name $suffix"
    }
}

object PlaylistNames {
    /** Pass State.playlists, which contains only Playlists outside Trash. */
    fun validate(name: String, playlists: List<Playlist>, excluding: String? = null): Names.Problem? =
        Names.validate(name, playlists.filterNot { it.id == excluding }.map { it.name })
}

object ViewNames {
    fun validate(name: String, views: List<View>, excluding: String? = null): Names.Problem? =
        Names.validate(name, views.filterNot { it.id == excluding }.map { it.name })
}

/** Expand local restores into existing wire Changes; shared State replay remains unchanged. */
object PlaylistRestores {
    fun changes(state: State, change: Change.RestorePlaylist, at: Long): List<Change> {
        val restored = StateRules.apply(state, change, at).playlists.find { it.id == change.playlistId }
        if (restored == null || state.playlists.any { it.id == change.playlistId }) return listOf(change)
        val name = Names.nextFreeName(restored.name, state.playlists.map { it.name })
        return if (name == restored.name) listOf(change) else listOf(change, Change.RenamePlaylist(restored.id, name))
    }
}
