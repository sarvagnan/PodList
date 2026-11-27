package app.podlist

import androidx.compose.runtime.*
import app.podlist.data.FormDraftStore
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue

@Stable
internal class FormDraftState(private val store: FormDraftStore, initial: Map<String, String>, revision: String?) {
    var restoreRevision by mutableIntStateOf(0)
        private set
    private val writer = app.podlist.data.DraftWriteBuffer(onFailure = {
        android.util.Log.e("PodList", "Could not save form drafts", it)
    }, baseline = revision, write = store::putCheckpoint)
    private val values = initial.toList().toMutableStateMap()
    private val versions = mutableMapOf<String, Long>()
    private var version = 0L

    fun checkpoint() = writer.checkpoint()
    fun requestFlush() = writer.requestFlush()
    suspend fun flush() = writer.flush()
    fun get(key: String): String? = values[key]
    fun snapshot(prefix: String): Map<String, String> = values.filterKeys { it.startsWith(prefix) }

    fun clearIfUnchanged(prefix: String, submitted: Map<String, String>): Boolean {
        if (snapshot(prefix) != submitted) return false
        writer.enqueue { store.clearIfUnchanged(prefix, submitted) }
        remove(prefix)
        return true
    }

    suspend fun reload() {
        val started = version
        val restored = writer.afterFlush(store::load)
        (values.keys.toSet() + restored.keys).forEach { key ->
            if ((versions[key] ?: 0) <= started) {
                val value = restored[key]
                if (value == null) values.remove(key) else values[key] = value
            }
        }
    }

    fun put(key: String, text: String) {
        if (values[key] == text) return
        writer.put(key, text)
        versions[key] = ++version
        values[key] = text
    }

    fun pendingNewViewId(): String = get("new-view/id")
        ?: java.util.UUID.randomUUID().toString().also { put("new-view/id", it); requestFlush() }

    suspend fun replaceDraft(prefixes: List<String>, replacement: Map<String, String>, scope: String): Map<String, String> {
        val started = version
        val before = writer.afterFlush { store.replaceDraft(prefixes, replacement, scope) }
        (values.keys.filter { key -> prefixes.any(key::startsWith) } + replacement.keys).forEach { key ->
            if ((versions[key] ?: 0) <= started) {
                val value = replacement[key]
                versions[key] = ++version
                if (value == null) values.remove(key) else values[key] = value
            }
        }
        restoreRevision++
        return before
    }

    fun finishNewView(id: String) {
        writer.enqueue { store.finishNewView(id) }
        remove("view:$id/")
        if (get("new-view/id") == id) remove("new-view/")
    }

    fun hasInvalid(prefix: String): Boolean = values.any { (key, value) -> key.startsWith(prefix + "invalid/") && value == "true" }

    fun clear(prefix: String) {
        writer.enqueue { store.clear(prefix) }
        remove(prefix)
    }

    private fun remove(prefix: String) {
        values.keys.filter { it.startsWith(prefix) }.forEach { key ->
            versions[key] = ++version
            values.remove(key)
        }
    }
}

internal val LocalViewDraftPrefix = staticCompositionLocalOf<String?> { null }

internal val LocalFormDrafts = staticCompositionLocalOf<FormDraftState> { error("No draft store") }

@Composable
internal fun rememberDraftText(key: String, initial: String = ""): MutableState<String> {
    val drafts = LocalFormDrafts.current
    val fallback by rememberUpdatedState(initial)
    DisposableEffect(drafts, key) { onDispose { drafts.requestFlush() } }
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
