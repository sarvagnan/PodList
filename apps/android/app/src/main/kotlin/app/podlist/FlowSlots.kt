package app.podlist

import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.SemanticsPropertyKey
import androidx.compose.ui.semantics.SemanticsPropertyReceiver
import androidx.compose.ui.semantics.semantics

internal val FlowSlotKey = SemanticsPropertyKey<String>("FlowSlot")
internal var SemanticsPropertyReceiver.flowSlot by FlowSlotKey
internal fun flowSlot(slot: String): Modifier = Modifier.semantics { flowSlot = slot }
