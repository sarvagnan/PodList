package app.podlist.domain

import org.junit.jupiter.api.Test
import kotlin.test.*

class TwoTapConfirmationTest {
    @Test fun `only a deliberate second activation confirms`() {
        val check = TwoTapConfirmation()
        assertFalse(check.isArmed)
        assertFalse(check.canConfirm(1_000, 300))
        val armed = check.arm(1_000, 5_000)
        assertTrue(armed.isArmed)
        assertFalse(armed.canConfirm(1_000, 300))
        assertFalse(armed.canConfirm(1_299, 300))
        assertFalse(armed.canConfirm(1_300, 300))
        assertTrue(armed.canConfirm(1_301, 300))
        assertTrue(armed.canConfirm(5_999, 300))
    }

    @Test fun `timeout and disarm prevent confirmation until armed again`() {
        val armed = TwoTapConfirmation().arm(1_000, 5_000)
        assertFalse(armed.isArmedAt(6_000))
        assertFalse(armed.canConfirm(6_000, 300))
        assertFalse(armed.disarm().isArmed)
        assertFalse(armed.disarm().canConfirm(2_000, 300))
        val rearmed = armed.disarm().arm(9_000, 5_000)
        assertFalse(rearmed.canConfirm(9_100, 300))
        assertTrue(rearmed.canConfirm(9_500, 300))
    }

    @Test fun `accessibility timeout can extend the activation window`() {
        val armed = TwoTapConfirmation().arm(1_000, 20_000)
        assertTrue(armed.canConfirm(10_000, 500))
        assertFalse(armed.canConfirm(21_000, 500))
    }
}
