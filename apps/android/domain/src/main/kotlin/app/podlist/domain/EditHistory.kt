package app.podlist.domain

/** Only successful reversals move between stacks. The caller serializes edits and execution. */
class EditHistory<T> {
    private val past = mutableListOf<T>()
    private val future = mutableListOf<T>()
    private var group: String? = null
    val undo: T? get() = past.lastOrNull()
    val redo: T? get() = future.lastOrNull()

    fun record(value: T, typingGroup: String? = null) {
        if (typingGroup == null || group != typingGroup || past.isEmpty()) past += value
        group = typingGroup
        future.clear()
    }

    fun endTyping() { group = null }
    fun clear() { past.clear(); future.clear(); endTyping() }

    suspend fun reverse(redo: Boolean = false, apply: suspend (T) -> T): Boolean {
        val source = if (redo) future else past
        val destination = if (redo) past else future
        val step = source.lastOrNull() ?: return false
        val inverse = apply(step)
        source.removeAt(source.lastIndex)
        destination += inverse
        endTyping()
        return true
    }
}
