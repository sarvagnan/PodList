package app.podlist

import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.*

internal fun flowLabel(text: String, substring: Boolean = false) =
    hasText(text, substring = substring) or hasContentDescription(text, substring = substring)

internal fun flowControl(text: String, substring: Boolean = false) =
    flowLabel(text, substring) and hasClickAction() and isEnabled()

internal fun flowField(text: String) = hasSetTextAction() and hasText(text)

internal fun flowNavigation(text: String) = flowLabel(text) and hasClickAction() and
    SemanticsMatcher("navigation item") {
        it.config.getOrNull(SemanticsProperties.Selected) != null &&
            it.config.getOrNull(SemanticsProperties.Role) == Role.Tab
    }
