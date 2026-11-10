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

    @Test fun `integer rejection explains the correction while preserving raw input`() {
        assertEquals(NumberInput.Problem.WholeNumber, NumberInput.problem(NumberInput.format(1.5), 1.0, true))
        assertEquals(NumberInput.Problem.Number, NumberInput.problem("1x", 1.0, true))
        assertEquals(NumberInput.Problem.Minimum, NumberInput.problem("0", 1.0, true))
        assertEquals(NumberInput.Problem.Maximum, NumberInput.problem("2147483648", 1.0, true))
        assertNull(NumberInput.problem("", 1.0, true))
        assertNull(NumberInput.problem("2147483647", 1.0, true))
    }

    @Test fun `decimal conditions retain their validation without imposing integer rules`() {
        assertTrue(NumberInput.valid(NumberInput.format(1.5)))
        assertFalse(NumberInput.valid("-1"))
        assertFalse(NumberInput.valid("NaN"))
        assertFalse(NumberInput.valid("1x"))
    }
}
