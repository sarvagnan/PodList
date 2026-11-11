package app.podlist.data

import java.io.File
import java.io.FileOutputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.Properties
import app.podlist.domain.ProtocolJson
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString

/** Installation settings exist before a Library session, and never sync between Devices. */
class DeviceSettingsStore(private val file: File) {
    private val values = Properties().apply { if (file.exists()) file.inputStream().use(::load) }

    var serverAddressDraft: String?
        @Synchronized get() = values.getProperty("serverAddressDraft")
        @Synchronized set(value) { put("serverAddressDraft", value) }

    var serverAddressSelection: String?
        @Synchronized get() = values.getProperty("serverAddressSelection")
        @Synchronized set(value) { put("serverAddressSelection", value) }

    @Synchronized fun serverDraft() = ServerDraft(serverAddressDraft, serverAddressSelection)
    @Synchronized fun retainedServerDraft(): ServerDraft? = values.getProperty("discardedServerDraft")?.let { ProtocolJson.decodeFromString<ServerDraft>(it) }
    @Synchronized fun replaceServerDraft(next: ServerDraft): ServerDraft {
        val before = serverDraft()
        putAll(mapOf("discardedServerDraft" to ProtocolJson.encodeToString(before), "serverAddressDraft" to next.address, "serverAddressSelection" to next.selection))
        return before
    }

    var appearance: Appearance
        @Synchronized get() = Appearance.entries.find { it.name == values.getProperty("appearance") } ?: Appearance.System
        @Synchronized set(value) { put("appearance", value.name) }

    // Finish the durable write before acknowledging an edit. Replacement is atomic, so task removal
    // or a killed process leaves either the previous complete settings or the new complete settings.
    private fun put(key: String, value: String?) = putAll(mapOf(key to value))

    private fun putAll(changes: Map<String, String?>) {
        val next = Properties().apply {
            putAll(this@DeviceSettingsStore.values)
            changes.forEach { (key, value) -> if (value == null) remove(key) else setProperty(key, value) }
        }
        file.parentFile?.mkdirs()
        val temporary = File(file.path + ".tmp")
        FileOutputStream(temporary).use { output -> next.store(output, null); output.fd.sync() }
        Files.move(temporary.toPath(), file.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
        values.clear()
        values.putAll(next)
    }
}

enum class Appearance {
    System, Light, Dark;

    fun isDark(systemDark: Boolean): Boolean = when (this) {
        System -> systemDark
        Light -> false
        Dark -> true
    }
}

@Serializable
data class ServerDraft(val address: String?, val selection: String?)
