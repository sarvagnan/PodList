package app.podlist.data

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.nio.file.Path
import kotlin.test.*

class DeviceSettingsStoreTest {
    @TempDir lateinit var directory: Path
    private val file: File get() = directory.resolve("device-settings.properties").toFile()

    @Test fun `first run needs no Library and defaults to system appearance`() {
        val store = DeviceSettingsStore(file)
        assertNull(store.serverAddressDraft)
        assertEquals(Appearance.System, store.appearance)
        assertFalse(file.exists())
    }

    @Test fun `raw address survives form removal and a fresh store without a Library session`() {
        for (raw in listOf("https://pod.example:84/", "  https://例.example/part%20typed  ", "https://", "")) {
            DeviceSettingsStore(file).serverAddressDraft = raw
            assertEquals(raw, DeviceSettingsStore(file).serverAddressDraft)
        }
    }

    @Test fun `opening or leaving Settings and changing appearance preserve an unfinished address`() {
        DeviceSettingsStore(file).serverAddressDraft = "https://unfinished.example"
        val settings = DeviceSettingsStore(file)
        settings.appearance = Appearance.Dark
        val relaunched = DeviceSettingsStore(file)
        assertEquals("https://unfinished.example", relaunched.serverAddressDraft)
        assertEquals(Appearance.Dark, relaunched.appearance)
    }

    @Test fun `explicit discard or successful connection clears the draft durably but keeps appearance`() {
        val store = DeviceSettingsStore(file)
        store.appearance = Appearance.Light
        store.serverAddressDraft = "https://pod.example"
        store.serverAddressDraft = null
        assertNull(DeviceSettingsStore(file).serverAddressDraft)
        assertEquals(Appearance.Light, DeviceSettingsStore(file).appearance)
    }

    @Test fun `an interrupted temporary write cannot replace the last acknowledged draft`() {
        DeviceSettingsStore(file).serverAddressDraft = "https://kept.example"
        File(file.path + ".tmp").writeText("serverAddressDraft=https://partial")
        assertEquals("https://kept.example", DeviceSettingsStore(file).serverAddressDraft)
        DeviceSettingsStore(file).appearance = Appearance.Dark
        assertEquals("https://kept.example", DeviceSettingsStore(file).serverAddressDraft)
        assertFalse(File(file.path + ".tmp").exists())
    }

    @Test fun `every appearance persists across recreation and resolves independently of the system`() {
        for (appearance in Appearance.entries) {
            DeviceSettingsStore(file).appearance = appearance
            assertEquals(appearance, DeviceSettingsStore(file).appearance)
        }
        assertFalse(Appearance.System.isDark(false))
        assertTrue(Appearance.System.isDark(true))
        assertFalse(Appearance.Light.isDark(false))
        assertFalse(Appearance.Light.isDark(true))
        assertTrue(Appearance.Dark.isDark(false))
        assertTrue(Appearance.Dark.isDark(true))
    }

    @Test fun `an unknown appearance uses system default without losing the draft`() {
        file.writeText("appearance=future-choice\nserverAddressDraft=https://kept.example\n")
        assertEquals(Appearance.System, DeviceSettingsStore(file).appearance)
        assertEquals("https://kept.example", DeviceSettingsStore(file).serverAddressDraft)
    }
}
