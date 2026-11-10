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

@Composable
internal fun ServerScreen(model: AppModel, current: String?, connected: (() -> Unit)? = null) {
    val draft by model.serverAddressDraft.collectAsState()
    val input = draft ?: current.orEmpty()
    val checking by model.connecting.collectAsState()
    val error by model.connectionError.collectAsState()
    Column(Modifier.fillMaxSize().imePadding()
        .verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text(stringResource(R.string.connect_help), style = MaterialTheme.typography.bodyLarge)
        OutlinedTextField(value = input, onValueChange = { model.setServerAddressDraft(it); model.connectionError.value = null },
            label = { Text(stringResource(R.string.server_address)) },
            placeholder = { Text(stringResource(R.string.server_example)) },
            singleLine = true, enabled = !checking, isError = error != null,
            supportingText = error?.let { problem -> ({ InlineError(stringResource(when (problem) {
                ConnectionError.Address -> if (BuildConfig.DEBUG) R.string.address_error_debug else R.string.address_error
                ConnectionError.Offline -> R.string.offline_error
                ConnectionError.Tls -> R.string.tls_error
                ConnectionError.Server -> R.string.server_error
                ConnectionError.Response -> R.string.response_error
            })) }) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Go), keyboardActions = KeyboardActions(onGo = { if (!checking && input.isNotBlank()) model.connect(input) { connected?.invoke() } }), modifier = Modifier.fillMaxWidth().then(FocusedInputModifier()))
        CommitActions {
            if (draft != null) TextButton(onClick = { model.setServerAddressDraft(null); model.connectionError.value = null }, enabled = !checking, modifier = Modifier.heightIn(min = 48.dp)) {
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
