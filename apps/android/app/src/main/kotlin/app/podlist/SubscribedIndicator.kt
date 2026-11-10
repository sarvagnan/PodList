package app.podlist

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp

/** Shared status glyph; the Podcast page supplies its two-tap Unsubscribe semantics. */
@Composable
internal fun SubscribedIndicator(showText: Boolean = false) {
    Row(Modifier.heightIn(min = 48.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Icon(painterResource(R.drawable.ic_check), if (showText) null else stringResource(R.string.subscribed),
            tint = LocalSubscribedColors.current.foreground,
            modifier = Modifier.background(LocalSubscribedColors.current.background, CircleShape).padding(4.dp).size(24.dp))
        if (showText) Text(stringResource(R.string.subscribed), color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.labelLarge)
    }
}
