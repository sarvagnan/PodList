package app.podlist

import android.app.UiModeManager
import android.content.Context
import app.podlist.data.Appearance

internal fun Context.applyLaunchAppearance(appearance: Appearance) {
    getSystemService(UiModeManager::class.java).setApplicationNightMode(when (appearance) {
        Appearance.Light -> UiModeManager.MODE_NIGHT_NO
        Appearance.Dark -> UiModeManager.MODE_NIGHT_YES
        // For the application override, AUTO clears the local night qualifier and follows the system.
        Appearance.System -> UiModeManager.MODE_NIGHT_AUTO
    })
}
