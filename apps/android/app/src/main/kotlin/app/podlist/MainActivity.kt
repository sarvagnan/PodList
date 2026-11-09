package app.podlist

import android.os.Bundle
import android.content.Intent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val model = (application as PodListApplication).model
        handleShortcut(intent)
        setContent { PodListTheme { PodListShell(model) } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleShortcut(intent)
    }

    private fun handleShortcut(intent: Intent) {
        intent.action?.removePrefix("app.podlist.OPEN_")?.takeIf { it in listOf("VIEWS", "PLAYLISTS", "LIBRARY") }?.let {
            (application as PodListApplication).model.shortcut.value = it
        }
    }

    override fun onStop() {
        (application as PodListApplication).model.flushPlayback()
        super.onStop()
    }

    override fun onStart() {
        super.onStart()
        (application as PodListApplication).model.requestSync()
    }
}

// Tonal roles derived from the PodList blue seed. System fonts; the system selects dark mode.
private val LightColors = lightColorScheme(
    primary = Color(0xff2b50c8), onPrimary = Color.White,
    primaryContainer = Color(0xffdde1ff), onPrimaryContainer = Color(0xff001551),
    secondary = Color(0xff5a5d72), onSecondary = Color.White,
    secondaryContainer = Color(0xffdfe1f9), onSecondaryContainer = Color(0xff171b2c),
    tertiary = Color(0xff76546f), onTertiary = Color.White,
    tertiaryContainer = Color(0xffffd7f3), onTertiaryContainer = Color(0xff2d1229),
    background = Color(0xfffaf8ff), onBackground = Color(0xff1b1b21),
    surface = Color(0xfffaf8ff), onSurface = Color(0xff1b1b21),
    surfaceVariant = Color(0xffe3e1ec), onSurfaceVariant = Color(0xff46464f),
    outline = Color(0xff777680)
)
private val DarkColors = darkColorScheme(
    primary = Color(0xffb8c4ff), onPrimary = Color(0xff002781),
    primaryContainer = Color(0xff0b379f), onPrimaryContainer = Color(0xffdde1ff),
    secondary = Color(0xffc3c5dd), onSecondary = Color(0xff2c3042),
    secondaryContainer = Color(0xff434659), onSecondaryContainer = Color(0xffdfe1f9),
    tertiary = Color(0xffe4bad8), onTertiary = Color(0xff44263f),
    tertiaryContainer = Color(0xff5d3c56), onTertiaryContainer = Color(0xffffd7f3),
    background = Color(0xff121318), onBackground = Color(0xffe4e1e9),
    surface = Color(0xff121318), onSurface = Color(0xffe4e1e9),
    surfaceVariant = Color(0xff46464f), onSurfaceVariant = Color(0xffc7c5d0),
    outline = Color(0xff918f9a)
)

@Composable
fun PodListTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        typography = Typography(),
        content = content
    )
}
