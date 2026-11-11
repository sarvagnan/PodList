package app.podlist

import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot

@Stable
internal class CollapsingTitle {
    var viewportTop by mutableFloatStateOf(0f)
    var headlineTop by mutableFloatStateOf(Float.POSITIVE_INFINITY)
    val headlineVisible: Boolean get() = headlineTop >= viewportTop - 1f
    fun viewport() = Modifier.onGloballyPositioned { viewportTop = it.positionInRoot().y }
}
internal val LocalCollapsingTitle = staticCompositionLocalOf<CollapsingTitle?> { null }

@Composable
internal fun headlineVisibility(title: CollapsingTitle?): Modifier {
    DisposableEffect(title) { onDispose { title?.headlineTop = Float.NEGATIVE_INFINITY } }
    return Modifier.onGloballyPositioned { title?.headlineTop = it.positionInRoot().y }
}
