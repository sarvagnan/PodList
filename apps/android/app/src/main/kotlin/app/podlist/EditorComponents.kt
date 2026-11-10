@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import androidx.compose.foundation.background
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
internal fun ValueRow(label: String, value: String, changed: Boolean = false, help: String? = null, enabled: Boolean = true, compact: Boolean = false, onClick: () -> Unit) {
    val valueColor = MaterialTheme.colorScheme.onSurfaceVariant
    val shownValue = if (changed) stringResource(R.string.changed_value, value) else value
    Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).clickable(enabled = enabled, onClick = onClick).padding(horizontal = 16.dp, vertical = if (compact) 12.dp else 16.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(if (compact) 4.dp else 8.dp)) {
            Text(label, style = MaterialTheme.typography.bodyLarge)
            Text(shownValue, style = MaterialTheme.typography.bodyMedium, color = valueColor)
            help?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = valueColor) }
        }
    }
    ContentDivider()
}

// Single-field forms commit directly beneath their field; sheets and multi-field forms may pin this region.
// The primary commit is trailing and filled; secondary actions are text. Actions wrap before they crowd.
@Composable
internal fun CommitActions(modifier: Modifier = Modifier, content: @Composable FlowRowScope.() -> Unit) {
    val local = LocalSheetSnackbar.current
    Column(modifier.fillMaxWidth()) {
        // Reserve real space above the actions. An overlay padded only by the action height
        // still covers the final option/field, especially when text is enlarged.
        if (local?.snackbar?.currentSnackbarData != null) FeedbackSnackbarHost(local.snackbar)
        FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.End),
            verticalArrangement = Arrangement.spacedBy(12.dp), content = content)
    }
}

/** Primary commits share filled emphasis and a minimum 48 dp target inside CommitActions. */
@Composable
internal fun CommitButton(onClick: () -> Unit, enabled: Boolean = true, content: @Composable RowScope.() -> Unit) {
    Button(onClick = onClick, enabled = enabled, modifier = Modifier.heightIn(min = 48.dp), content = content)
}

@Composable
internal fun ContentTextButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    colors: ButtonColors = ButtonDefaults.textButtonColors(),
    content: @Composable RowScope.() -> Unit
) {
    // Callers supply the 16 dp gutter; the label starts on that keyline.
    TextButton(onClick, modifier.heightIn(min = 48.dp), enabled = enabled,
        colors = colors, contentPadding = PaddingValues(vertical = 8.dp), content = content)
}

/** Bordered secondary commands remain recognisable beside headings and explanatory text. */
@Composable
internal fun ContentActionButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    destructive: Boolean = false,
    content: @Composable RowScope.() -> Unit
) {
    val color = if (destructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
    OutlinedButton(onClick, modifier.heightIn(min = 48.dp),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = color),
        border = androidx.compose.foundation.BorderStroke(1.dp, if (destructive) color else MaterialTheme.colorScheme.outline),
        content = content)
}

/** Only bars with page actions split at large text sizes; history-only controls stay inline. */
@Composable
internal fun PodListTopAppBar(
    title: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    navigationIcon: @Composable () -> Unit = {},
    actions: @Composable RowScope.() -> Unit = {},
    scrollBehavior: TopAppBarScrollBehavior? = null,
    separateActions: Boolean = true
) {
    if (androidx.compose.ui.platform.LocalDensity.current.fontScale >= 1.5f && separateActions) {
        Surface {
            Column(modifier) {
                TopAppBar(title = title, navigationIcon = navigationIcon,
                    expandedHeight = with(androidx.compose.ui.platform.LocalDensity.current) { 56.sp.toDp() + 16.dp },
                    scrollBehavior = scrollBehavior)
                Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp),
                    horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically,
                    content = actions)
            }
        }
    } else TopAppBar(title = title, modifier = modifier, navigationIcon = navigationIcon,
        actions = actions, scrollBehavior = scrollBehavior,
        expandedHeight = if (androidx.compose.ui.platform.LocalDensity.current.fontScale >= 1.5f) with(androidx.compose.ui.platform.LocalDensity.current) { 56.sp.toDp() + 16.dp } else 64.dp)
}

/** Quiet, inset separators keep adjacent list rows distinct without heavy rules. */
@Composable
internal fun ContentDivider() {
    HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = .55f))
}

@Composable
internal fun EditorSheet(title: String, close: () -> Unit, done: (() -> Unit)? = null, doneEnabled: Boolean = true, doneLabel: Int = R.string.m4_done, content: @Composable ColumnScope.() -> Unit) {
    val model = LocalAppModel.current
    FeedbackSheet(modifier = historyShortcuts(model), onDismissRequest = close, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(Modifier.fillMaxWidth().imePadding()) {
            Column(Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState()).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(title, Modifier.semantics { heading() }, style = MaterialTheme.typography.titleLarge)
                content()
            }
            CommitActions(Modifier.padding(16.dp)) {
                CommitButton(onClick = done ?: close, enabled = doneEnabled) { Text(stringResource(doneLabel)) }
            }
        }
    }
}

@Composable
internal fun <T> ChoiceRows(choices: List<Pair<T, String>>, selected: T, supporting: ((T) -> String)? = null, enabled: Boolean = true, choose: (T) -> Unit) {
    choices.forEach { (value, label) ->
        Row(Modifier.fillMaxWidth().heightIn(min = 48.dp).selectable(selected == value, enabled = enabled, role = Role.RadioButton, onClick = { choose(value) }).semantics(mergeDescendants = true) {}, verticalAlignment = Alignment.CenterVertically) {
            RadioButton(selected == value, onClick = null, enabled = enabled)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f).padding(vertical = 8.dp)) {
                Text(label)
                supporting?.let { Text(it(value), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
    }
}

@Composable
internal fun NumberField(label: String, value: Double?, integer: Boolean = false, minimum: Double = 0.0, autofocus: Boolean = false, draftKey: String? = null, changed: (Double?) -> Unit) {
    val viewDraftPrefix = LocalViewDraftPrefix.current
    val drafts = LocalFormDrafts.current
    val key = draftKey ?: requireNotNull(viewDraftPrefix) + "/number/$label"
    val initial = value?.let { if (integer) it.toLong().toString() else NumberInput.format(it) }.orEmpty()
    // Raw drafts own the field until finish/discard/Undo, so delayed model echoes cannot replace input.
    var text by rememberDraftText(key, initial)
    val problem = NumberInput.problem(text, minimum, integer)
    val valid = problem == null
    LaunchedEffect(valid) { viewDraftPrefix?.let { drafts.put("$it/invalid/$label", (!valid).toString()) } }
    val model = LocalAppModel.current
    val currentValid by rememberUpdatedState(valid)
    DisposableEffect(Unit) { onDispose { if (!currentValid) model.messages.trySend(AppMessage(R.string.invalid_number_not_applied)) } }
    var fieldValue by rememberFieldValue(text)
    OutlinedTextField(fieldValue, { fieldValue = it; text = it.text; val n = NumberInput.parse(it.text); if (it.text.isBlank()) changed(null) else if (n != null && n.isFinite() && n >= minimum && (!integer || n % 1 == 0.0 && n <= Int.MAX_VALUE)) changed(n) },
        label = { Text(label) }, placeholder = { Text(stringResource(R.string.any)) }, singleLine = true,
        isError = !valid, supportingText = if (!valid) ({ InlineError(if (integer) stringResource(when (problem) {
            NumberInput.Problem.WholeNumber -> R.string.number_whole_error
            NumberInput.Problem.Maximum -> R.string.number_maximum_error
            NumberInput.Problem.Minimum -> R.string.number_minimum_error
            else -> R.string.number_integer_error
        }, minimum.toLong(), Int.MAX_VALUE) else stringResource(R.string.m4_number_error, minimum.toLong())) }) else null,
        // Number requests TYPE_CLASS_NUMBER without the decimal-point flag; pasted text is still validated.
        keyboardOptions = KeyboardOptions(keyboardType = if (integer) KeyboardType.Number else KeyboardType.Decimal), modifier = Modifier.fillMaxWidth().then(if (autofocus) FocusedInputModifier() else Modifier))
}

@Composable
internal fun speedSetting(value: Double): String {
    val number = java.text.NumberFormat.getNumberInstance().apply { minimumFractionDigits = 1; maximumFractionDigits = 2; isGroupingUsed = false }.format(value)
    return stringResource(R.string.speed_value, number)
}

@Composable
internal fun CheckRow(label: String, checked: Boolean, inset: Boolean = false, changed: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().background(if (checked) MaterialTheme.colorScheme.secondaryContainer else androidx.compose.ui.graphics.Color.Transparent).padding(horizontal = if (inset) 16.dp else 0.dp).heightIn(min = 48.dp).toggleable(checked, role = Role.Checkbox, onValueChange = changed).semantics(mergeDescendants = true) {}, verticalAlignment = Alignment.CenterVertically) {
        Checkbox(checked, null); Spacer(Modifier.width(12.dp)); Text(label, Modifier.weight(1f))
    }
}

@Composable
internal fun SwitchRow(label: String, checked: Boolean, help: String? = null, changed: (Boolean) -> Unit) {
    ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), modifier = Modifier.fillMaxWidth().toggleable(checked, role = Role.Switch, onValueChange = changed).semantics(mergeDescendants = true) {},
        headlineContent = { Text(label) }, supportingContent = help?.let { { Text(it) } }, trailingContent = { Switch(checked, null) })
    ContentDivider()
}

@Composable
internal fun FocusedInputModifier(once: Boolean = false): Modifier {
    val focus = remember { FocusRequester() }
    val browsing = LocalBrowsingState.current
    val route = LocalBrowsingRoute.current
    val firstVisit = rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        val visited = route in browsing?.focusedRoutes.orEmpty()
        if (!once || !firstVisit.value && !visited) {
            firstVisit.value = true
            if (once) browsing?.focusedRoutes?.add(route)
            focus.requestFocus()
        }
    }
    return Modifier.focusRequester(focus).then(textFieldHistoryShortcuts())
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

@Composable
internal fun SearchClearButton(text: String, clear: () -> Unit) {
    if (text.isNotEmpty()) ActionIcon(R.drawable.ic_close, stringResource(R.string.clear_search), action = clear)
}

/** Field supporting slots and other inline failures share one tone, size and announcement. */
@Composable
internal fun InlineError(message: String, modifier: Modifier = Modifier) {
    Text(message, modifier.padding(vertical = 4.dp).errorAnnouncement(), color = MaterialTheme.colorScheme.error,
        style = MaterialTheme.typography.bodySmall)
}

/** Loading draws inside a permanent seam, so existing content keeps its position. */
@Composable
internal fun LoadingLine(loading: Boolean, label: Int, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(4.dp)) {
        if (loading) LinearProgressIndicator(Modifier.fillMaxWidth().then(ProgressModifier(label)))
    }
}
