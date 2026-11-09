@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.clickable
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
    ListItem(modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp).clickable(onClick = onClick),
        headlineContent = { Text(label) }, supportingContent = help?.let { { Text(it) } }, trailingContent = {
            Text(value, Modifier.widthIn(max = 168.dp), color = if (changed) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.End)
        })
}

@Composable
internal fun EditorSheet(title: String, close: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    ModalBottomSheet(onDismissRequest = close) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(bottom = 24.dp).imePadding().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(title, Modifier.weight(1f), style = MaterialTheme.typography.titleLarge)
                TextButton(onClick = close) { Text(stringResource(R.string.m4_done)) }
            }
            content()
        }
    }
}

@Composable
internal fun <T> ChoiceRows(choices: List<Pair<T, String>>, selected: T, choose: (T) -> Unit) {
    choices.forEach { (value, label) ->
        Row(Modifier.fillMaxWidth().heightIn(min = 48.dp).clickable { choose(value) }, verticalAlignment = Alignment.CenterVertically) {
            RadioButton(selected == value, onClick = { choose(value) }); Text(label, Modifier.weight(1f))
        }
    }
}

@Composable
internal fun NumberField(label: String, value: Double?, integer: Boolean = false, minimum: Double = 0.0, changed: (Double?) -> Unit) {
    var text by rememberSaveable(label) { mutableStateOf(value?.let { if (integer) it.toLong().toString() else it.toString() }.orEmpty()) }
    val parsed = text.toDoubleOrNull()
    val valid = text.isBlank() || parsed != null && parsed.isFinite() && parsed >= minimum && (!integer || parsed % 1 == 0.0 && parsed <= Int.MAX_VALUE)
    OutlinedTextField(text, { text = it; val n = it.toDoubleOrNull(); if (it.isBlank()) changed(null) else if (n != null && n.isFinite() && n >= minimum && (!integer || n % 1 == 0.0 && n <= Int.MAX_VALUE)) changed(n) },
        label = { Text(label) }, placeholder = { Text(stringResource(R.string.any)) }, singleLine = true,
        isError = !valid, supportingText = if (!valid) ({ Text(stringResource(R.string.m4_number_error, minimum.toLong())) }) else null,
        keyboardOptions = KeyboardOptions(keyboardType = if (integer) KeyboardType.Number else KeyboardType.Decimal), modifier = Modifier.fillMaxWidth())
}

@Composable
internal fun speedSetting(value: Double): String {
    val number = java.text.NumberFormat.getNumberInstance().apply { minimumFractionDigits = 1; maximumFractionDigits = 2; isGroupingUsed = false }.format(value)
    return stringResource(R.string.speed_value, number)
}
