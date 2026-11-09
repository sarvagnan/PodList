package app.podlist

import androidx.compose.runtime.*
import app.podlist.data.FormDraftStore

@Stable
internal class FormDraftState(private val store: FormDraftStore, initial: Map<String, String>) {
    private val values = initial.toList().toMutableStateMap()
    fun get(key: String): String? = values[key]
    fun put(key: String, text: String) {
        if (values[key] == text) return
        // Commit raw input before acknowledging the edit, including task removal without saved state.
        store.put(key, text)
        values[key] = text
    }
    fun hasInvalid(prefix: String): Boolean = values.any { (key, value) -> key.startsWith(prefix + "invalid/") && value == "true" }
    fun clear(prefix: String) {
        store.clear(prefix)
        values.keys.filter { it.startsWith(prefix) }.forEach(values::remove)
    }
}

internal val LocalViewDraftPrefix = staticCompositionLocalOf<String?> { null }

internal val LocalFormDrafts = staticCompositionLocalOf<FormDraftState> { error("No draft store") }

@Composable
internal fun rememberDraftText(key: String, initial: String = ""): MutableState<String> {
    val drafts = LocalFormDrafts.current
    return remember(drafts, key) {
        object : MutableState<String> {
            override var value: String
                get() = drafts.get(key) ?: initial
                set(value) { drafts.put(key, value) }
            override fun component1() = value
            override fun component2(): (String) -> Unit = { value = it }
        }
    }
}
