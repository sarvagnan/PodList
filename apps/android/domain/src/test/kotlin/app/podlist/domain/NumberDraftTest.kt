package app.podlist.domain

import org.junit.jupiter.api.Test
import kotlin.test.*

class NumberDraftTest {
    @Test fun `invalid intermediate integers remain distinguishable from accepted caps`() {
        listOf("-", "1x", "0", "-1", "1.5", "2147483648").forEach {
            assertFalse(NumberInput.valid(it, 1.0, true), it)
        }
        listOf("", " ", "1", "123", "2147483647").forEach {
            assertTrue(NumberInput.valid(it, 1.0, true), it)
        }
    }

    @Test fun `decimal conditions retain their validation without imposing integer rules`() {
        assertTrue(NumberInput.valid(NumberInput.format(1.5)))
        assertFalse(NumberInput.valid("-1"))
        assertFalse(NumberInput.valid("NaN"))
        assertFalse(NumberInput.valid("1x"))
    }
}
