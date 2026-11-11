package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
import kotlinx.coroutines.launch

@Composable
internal fun ServerScreen(model: AppModel, current: String?, connected: (() -> Unit)? = null) {
    val draft by model.serverAddressDraft.collectAsState()
    val selection by model.serverAddressSelection.collectAsState()
    val input = draft ?: current.orEmpty()
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val discarded = stringResource(R.string.draft_discarded)
    val undoLabel = stringResource(R.string.undo)
    val checking by model.connecting.collectAsState()
    val error by model.connectionError.collectAsState()
    DisposableEffect(model) { onDispose { model.flushDrafts() } }
    Column(Modifier.fillMaxSize().imePadding()
        .verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text(stringResource(R.string.connect_help), style = MaterialTheme.typography.bodyLarge)
        var fieldValue by remember { mutableStateOf(TextFieldValue(input, draftSelection(selection, input.length))) }
        if (fieldValue.text != input) fieldValue = TextFieldValue(input, draftSelection(selection, input.length))
        OutlinedTextField(value = fieldValue, onValueChange = { fieldValue = it; model.setServerAddressDraft(it.text); model.setServerAddressSelection("${it.selection.start},${it.selection.end}"); model.connectionError.value = null },
            label = { Text(stringResource(R.string.server_address)) },
            singleLine = true, enabled = !checking, isError = error != null,
            supportingText = { val problem = error; if (problem == null) Text(stringResource(R.string.server_example)) else InlineError(stringResource(when (problem) {
                ConnectionError.Address -> if (BuildConfig.DEBUG) R.string.address_error_debug else R.string.address_error
                ConnectionError.Offline -> R.string.offline_error
                ConnectionError.Tls -> R.string.tls_error
                ConnectionError.Server -> R.string.server_error
                ConnectionError.Response -> R.string.response_error
            })) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Go), keyboardActions = KeyboardActions(onGo = { if (!checking && input.isNotBlank()) model.connect(input) { connected?.invoke() } }), modifier = Modifier.fillMaxWidth().then(FocusedInputModifier()))
        if (snackbar.currentSnackbarData != null) FeedbackSnackbarHost(snackbar)
        CommitActions(gap = 24.dp) {
            if (draft != null && draft != current.orEmpty()) TextButton(onClick = {
                val undo = model.discardServerDraft()
                if (undo != null) scope.launch {
                    if (snackbar.showSnackbar(discarded, undoLabel, duration = SnackbarDuration.Long) == SnackbarResult.ActionPerformed) undo()
                }
            }, enabled = !checking, modifier = Modifier.heightIn(min = 48.dp)) {
                Text(stringResource(R.string.discard_draft))
            }
            CommitButton(onClick = { model.connect(input) { connected?.invoke() } }, enabled = !checking && input.isNotBlank()) {
                Text(stringResource(if (checking) R.string.checking else R.string.connect))
            }
        }
        if (checking) LinearProgressIndicator(Modifier.fillMaxWidth().then(ProgressModifier(R.string.connect_to_server)))
        Text(stringResource(R.string.server_scope), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
