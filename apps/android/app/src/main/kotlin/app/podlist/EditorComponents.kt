@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.clickable
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.toggleable
import androidx.compose.ui.semantics.*
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.ui.text.input.ImeAction
import app.podlist.domain.NumberInput
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp

@Composable
internal fun ValueRow(label: String, value: String, changed: Boolean = false, help: String? = null, onClick: () -> Unit) {
    val large = androidx.compose.ui.platform.LocalDensity.current.fontScale >= 1.5f
    val valueColor = MaterialTheme.colorScheme.onSurfaceVariant
    val shownValue = if (changed) stringResource(R.string.changed_value, value) else value
    ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent),
        modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp).clickable(onClick = onClick),
        headlineContent = { Text(label) }, supportingContent = if (large || help != null) ({
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (large) Text(shownValue, color = valueColor)
                help?.let { Text(it) }
            }
        }) else null, trailingContent = if (large) null else ({
            Text(shownValue, Modifier.widthIn(max = 168.dp), style = MaterialTheme.typography.bodyMedium, color = valueColor, textAlign = androidx.compose.ui.text.style.TextAlign.End)
        }))
    HorizontalDivider()
}

@Composable
internal fun EditorSheet(title: String, close: () -> Unit, done: (() -> Unit)? = null, doneEnabled: Boolean = true, doneLabel: Int = R.string.m4_done, content: @Composable ColumnScope.() -> Unit) {
    val model = LocalAppModel.current
    FeedbackSheet(modifier = historyShortcuts(model), onDismissRequest = close, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(bottom = 24.dp).imePadding().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(title, Modifier.weight(1f).semantics { heading() }, style = MaterialTheme.typography.titleLarge)
                TextButton(onClick = done ?: close, enabled = doneEnabled) { Text(stringResource(doneLabel)) }
            }
            content()
        }
    }
}

@Composable
internal fun <T> ChoiceRows(choices: List<Pair<T, String>>, selected: T, supporting: ((T) -> String)? = null, choose: (T) -> Unit) {
    choices.forEach { (value, label) ->
        Row(Modifier.fillMaxWidth().heightIn(min = 48.dp).selectable(selected == value, role = Role.RadioButton, onClick = { choose(value) }).semantics(mergeDescendants = true) {}, verticalAlignment = Alignment.CenterVertically) {
            RadioButton(selected == value, onClick = null)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f).padding(vertical = 8.dp)) {
                Text(label)
                supporting?.let { Text(it(value), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
    }
}

@Composable
internal fun NumberField(label: String, value: Double?, integer: Boolean = false, minimum: Double = 0.0, autofocus: Boolean = false, changed: (Double?) -> Unit) {
    var text by rememberSaveable(label) { mutableStateOf(value?.let { if (integer) it.toLong().toString() else NumberInput.format(it) }.orEmpty()) }
    var observed by remember { mutableStateOf(value) }
    LaunchedEffect(value) { if (observed != value) { observed = value; if (NumberInput.parse(text) != value) text = value?.let { if (integer) it.toLong().toString() else NumberInput.format(it) }.orEmpty() } }
    val parsed = NumberInput.parse(text)
    val valid = text.isBlank() || parsed != null && parsed.isFinite() && parsed >= minimum && (!integer || parsed % 1 == 0.0 && parsed <= Int.MAX_VALUE)
    val model = LocalAppModel.current
    val currentValid by rememberUpdatedState(valid)
    DisposableEffect(Unit) { onDispose { if (!currentValid) model.messages.trySend(AppMessage(R.string.invalid_number_not_applied)) } }
    OutlinedTextField(text, { text = it; val n = NumberInput.parse(it); if (it.isBlank()) changed(null) else if (n != null && n.isFinite() && n >= minimum && (!integer || n % 1 == 0.0 && n <= Int.MAX_VALUE)) changed(n) },
        label = { Text(label) }, placeholder = { Text(stringResource(R.string.any)) }, singleLine = true,
        isError = !valid, supportingText = if (!valid) ({ Text(stringResource(R.string.m4_number_error, minimum.toLong()), Modifier.errorAnnouncement()) }) else null,
        keyboardOptions = KeyboardOptions(keyboardType = if (integer) KeyboardType.Number else KeyboardType.Decimal), modifier = Modifier.fillMaxWidth().then(if (autofocus) FocusedInputModifier() else Modifier))
}

@Composable
internal fun speedSetting(value: Double): String {
    val number = java.text.NumberFormat.getNumberInstance().apply { minimumFractionDigits = 1; maximumFractionDigits = 2; isGroupingUsed = false }.format(value)
    return stringResource(R.string.speed_value, number)
}

@Composable
internal fun CheckRow(label: String, checked: Boolean, inset: Boolean = false, changed: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = if (inset) 16.dp else 0.dp).heightIn(min = 48.dp).toggleable(checked, role = Role.Checkbox, onValueChange = changed).semantics(mergeDescendants = true) {}, verticalAlignment = Alignment.CenterVertically) {
        Checkbox(checked, null); Spacer(Modifier.width(12.dp)); Text(label, Modifier.weight(1f))
    }
}

@Composable
internal fun SwitchRow(label: String, checked: Boolean, help: String? = null, changed: (Boolean) -> Unit) {
    ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), modifier = Modifier.fillMaxWidth().toggleable(checked, role = Role.Switch, onValueChange = changed).semantics(mergeDescendants = true) {},
        headlineContent = { Text(label) }, supportingContent = help?.let { { Text(it) } }, trailingContent = { Switch(checked, null) })
    HorizontalDivider()
}

@Composable
internal fun FocusedInputModifier(): Modifier {
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) { focus.requestFocus() }
    return Modifier.focusRequester(focus)
}

@Composable
internal fun ActionIcon(icon: Int, label: String, modifier: Modifier = Modifier, enabled: Boolean = true, action: () -> Unit) {
    TooltipBox(positionProvider = TooltipDefaults.rememberTooltipPositionProvider(TooltipAnchorPosition.Above), tooltip = { PlainTooltip { Text(label) } }, state = rememberTooltipState()) {
        IconButton(onClick = action, enabled = enabled, modifier = modifier.size(48.dp)) { Icon(androidx.compose.ui.res.painterResource(icon), label) }
    }
}

@Composable
internal fun ActionTooltip(label: String, content: @Composable () -> Unit) {
    TooltipBox(positionProvider = TooltipDefaults.rememberTooltipPositionProvider(TooltipAnchorPosition.Above), tooltip = { PlainTooltip { Text(label) } }, state = rememberTooltipState()) { content() }
}

@Composable
internal fun DetailAction(icon: Int, label: String, action: () -> Unit) {
    ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).clickable(onClick = action),
        leadingContent = { Icon(androidx.compose.ui.res.painterResource(icon), null) }, headlineContent = { Text(label) })
}

@Composable
internal fun ProgressModifier(label: Int): Modifier {
    val name = stringResource(label)
    return Modifier.semantics { contentDescription = name }
}
