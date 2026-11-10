package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp

/**
 * A name that changes only through Rename, then Save or Cancel. The name has its own lines and wraps when
 * long; the controls sit below it. An open rename is kept under [draftKey] until Save or Cancel, so it
 * survives leaving the page and the app closing. Presence of the draft means open, even when empty.
 *
 * [problem] returns why the typed text can't be saved, or null. Save is also unavailable while the
 * trimmed text equals [name].
 */
@Composable
internal fun RenameableName(
    name: String,
    draftKey: String,
    problem: @Composable (String) -> String?,
    save: (String, (Boolean) -> Unit) -> Unit,
    modifier: Modifier = Modifier,
) {
    val drafts = LocalFormDrafts.current
    val draft = drafts.get(draftKey)
    val renameFocus = remember(draftKey) { FocusRequester() }
    var returnFocus by remember(draftKey) { mutableStateOf(false) }
    val keyboard = LocalSoftwareKeyboardController.current
    val close = {
        drafts.clear(draftKey)
        keyboard?.hide()
        returnFocus = true
    }
    Column(modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        if (draft == null) {
            Column(Modifier.fillMaxWidth().semantics(mergeDescendants = true) {}) {
                Text(stringResource(R.string.m4_name), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(name, style = MaterialTheme.typography.bodyLarge)
            }
            ContentTextButton(onClick = { drafts.put(draftKey, name) }, modifier = Modifier.focusRequester(renameFocus).heightIn(min = 48.dp)) {
                Text(stringResource(R.string.rename))
            }
            LaunchedEffect(returnFocus) {
                if (returnFocus) { renameFocus.requestFocus(); returnFocus = false }
            }
        } else {
            // The persisted text owns this field even if Undo or another Device changes the saved name.
            var value by remember(draftKey) { mutableStateOf(TextFieldValue(draft, TextRange(0, draft.length))) }
            val fieldFocus = remember { FocusRequester() }
            val reason = problem(value.text)
            var saving by remember { mutableStateOf(false) }
            val canSave = !saving && reason == null && value.text.trim() != name
            fun commit() {
                if (!canSave || drafts.get(draftKey) == null) return
                saving = true
                save(value.text.trim()) { accepted -> saving = false; if (accepted) close() }
            }
            OutlinedTextField(value, { input ->
                    // The keyboard can send a last update as Cancel or Save closes the field; it must not reopen it.
                    if (drafts.get(draftKey) == null) return@OutlinedTextField
                    // Names are one line. The field wraps a long one; Enter means Save rather than a line break.
                    val enter = input.text.contains('\n')
                    val clean = input.copy(text = input.text.replace("\n", ""), selection = TextRange(input.selection.start.coerceAtMost(input.text.replace("\n", "").length)))
                    drafts.put(draftKey, clean.text); value = clean
                    if (enter) commit()
                },
                enabled = !saving, label = { Text(stringResource(R.string.m4_name)) }, maxLines = 4, isError = reason != null,
                supportingText = if (reason != null) ({ InlineError(reason) }) else null,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { commit() }),
                modifier = Modifier.fillMaxWidth().focusRequester(fieldFocus).then(textFieldHistoryShortcuts()))
            CommitActions(Modifier.padding(top = 8.dp)) {
                TextButton(onClick = close, enabled = !saving, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.cancel)) }
                CommitButton(onClick = ::commit, enabled = canSave) { Text(stringResource(R.string.save)) }
            }
            LaunchedEffect(Unit) { fieldFocus.requestFocus(); keyboard?.show() }
        }
    }
}
