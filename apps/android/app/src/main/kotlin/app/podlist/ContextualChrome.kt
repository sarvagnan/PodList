package app.podlist

import androidx.compose.runtime.*

/** Membership survives overlapping navigation animations; disposing an old screen cannot clear a new one. */
@Stable
internal class ContextualChrome {
    private val modes = mutableStateMapOf<Any, Boolean>()
    val hidden: Boolean get() = modes.values.any { it }
    fun set(owner: Any, active: Boolean) { modes[owner] = active }
    fun remove(owner: Any) { modes.remove(owner) }
}
internal val LocalContextualChrome = staticCompositionLocalOf<ContextualChrome?> { null }

@Composable
internal fun ContextualMode(active: Boolean) {
    val chrome = LocalContextualChrome.current
    val owner = remember { Any() }
    DisposableEffect(chrome, active) {
        chrome?.set(owner, active)
        onDispose { chrome?.remove(owner) }
    }
}
