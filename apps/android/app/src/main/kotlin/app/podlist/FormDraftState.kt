package app.podlist

import androidx.compose.runtime.*
import app.podlist.data.FormDraftStore

@Stable
internal class FormDraftState(private val store: FormDraftStore, initial: Map<String, String>) {
    private val writer = app.podlist.data.DraftWriteBuffer(write = store::putAll)
    fun flush() = writer.flush()
    fun close() = writer.close()
    private val values = initial.toList().toMutableStateMap()
    fun get(key: String): String? = values[key]
    fun snapshot(prefix: String): Map<String, String> = values.filterKeys { it.startsWith(prefix) }
    fun clearIfUnchanged(prefix: String, submitted: Map<String, String>): Boolean {
        flush()
        if (snapshot(prefix) != submitted || !store.clearIfUnchanged(prefix, submitted)) return false
        values.keys.filter { it.startsWith(prefix) }.forEach(values::remove)
        return true
    }
    fun reload() { flush(); values.clear(); values.putAll(store.load()) }
    fun put(key: String, text: String) {
        if (values[key] == text) return
        writer.put(key, text)
        values[key] = text
    }
    fun pendingNewViewId(): String = store.pendingNewViewId().also { values["new-view/id"] = it }
    fun finishNewView(id: String) { flush(); store.finishNewView(id); reload() }
    fun hasInvalid(prefix: String): Boolean = values.any { (key, value) -> key.startsWith(prefix + "invalid/") && value == "true" }
    fun clear(prefix: String) {
        flush()
        store.clear(prefix)
        values.keys.filter { it.startsWith(prefix) }.forEach(values::remove)
    }
}

internal val LocalViewDraftPrefix = staticCompositionLocalOf<String?> { null }

internal val LocalFormDrafts = staticCompositionLocalOf<FormDraftState> { error("No draft store") }

@Composable
internal fun rememberDraftText(key: String, initial: String = ""): MutableState<String> {
    val drafts = LocalFormDrafts.current
    val fallback by rememberUpdatedState(initial)
    DisposableEffect(drafts, key) { onDispose { drafts.flush() } }
    return remember(drafts, key) {
        object : MutableState<String> {
            override var value: String
                get() = drafts.get(key) ?: fallback
                set(value) { drafts.put(key, value) }
            override fun component1() = value
            override fun component2(): (String) -> Unit = { value = it }
        }
    }
}
