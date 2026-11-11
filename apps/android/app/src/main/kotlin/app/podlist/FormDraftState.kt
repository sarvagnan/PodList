package app.podlist

import androidx.compose.runtime.*
import app.podlist.data.FormDraftStore
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue

@Stable
internal class FormDraftState(private val store: FormDraftStore, initial: Map<String, String>) {
    var restoreRevision by mutableIntStateOf(0)
        private set
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
    fun replaceDraft(prefixes: List<String>, replacement: Map<String, String>, scope: String): Map<String, String> {
        flush()
        val before = store.replaceDraft(prefixes, replacement, scope)
        prefixes.forEach { prefix -> values.keys.filter { it.startsWith(prefix) }.forEach(values::remove) }
        values.putAll(replacement)
        restoreRevision++
        return before
    }
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

/** String-backed persisted text restores at its end; live cursor/IME composition stays local. */
@Composable
internal fun rememberFieldValue(text: String): MutableState<TextFieldValue> {
    val state = remember { mutableStateOf(TextFieldValue(text, TextRange(text.length))) }
    if (state.value.text != text) state.value = TextFieldValue(text, TextRange(text.length))
    return state
}

/** Draft selections are durable too, so an explicit discard/Undo restores the caret, not just text. */
@Composable
internal fun rememberDraftFieldValue(key: String, text: String): MutableState<TextFieldValue> {
    val drafts = LocalFormDrafts.current
    val selectionKey = "$key/selection"
    val state = remember(drafts, key) {
        mutableStateOf(TextFieldValue(text, draftSelection(drafts.get(selectionKey), text.length)))
    }
    if (state.value.text != text) state.value = TextFieldValue(text, draftSelection(drafts.get(selectionKey), text.length))
    return remember(drafts, key, state) {
        object : MutableState<TextFieldValue> {
            override var value: TextFieldValue
                get() = state.value
                set(value) {
                    state.value = value
                    drafts.put(selectionKey, "${value.selection.start},${value.selection.end}")
                }
            override fun component1() = value
            override fun component2(): (TextFieldValue) -> Unit = { value = it }
        }
    }
}

internal fun draftSelection(raw: String?, length: Int): TextRange {
    val parts = raw?.split(',')?.mapNotNull(String::toIntOrNull)
    return if (parts?.size == 2) TextRange(parts[0].coerceIn(0, length), parts[1].coerceIn(0, length)) else TextRange(length)
}
