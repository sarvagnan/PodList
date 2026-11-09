package app.podlist

import android.os.Bundle
import android.content.Intent
import android.view.KeyEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.lerp
import android.app.UiModeManager
import androidx.core.content.ContextCompat
import androidx.compose.ui.graphics.Color

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val model = (application as PodListApplication).model
        if (savedInstanceState == null) handleIncoming(intent)
        setContent { PodListTheme { PodListShell(model) } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncoming(intent)
    }

    private fun handleIncoming(intent: Intent) {
        val model = (application as PodListApplication).model
        incomingContent(intent)?.let { model.incoming.value = app.podlist.domain.OneShotEvent(it) }
        intent.action?.removePrefix("app.podlist.OPEN_")?.takeIf { it in listOf("VIEWS", "PLAYLISTS", "LIBRARY") }?.let {
            (application as PodListApplication).model.shortcut.value = it
        }
    }

    // At the Activity, not a focusable root composable, which would make the whole screen one
    // screen reader item. This only sees keys nothing handled, so fields keep their own text undo.
    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        if (keyCode != KeyEvent.KEYCODE_Z || !event.isCtrlPressed) return super.onKeyDown(keyCode, event)
        val model = (application as PodListApplication).model
        if (event.isShiftPressed) model.redoEdit() else model.undoEdit()
        return true
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
    surfaceDim = Color(0xffdbd9e2), surfaceBright = Color(0xfffaf8ff),
    surfaceContainerLowest = Color.White, surfaceContainerLow = Color(0xfff4f3fc),
    surfaceContainer = Color(0xffefedf7), surfaceContainerHigh = Color(0xffe9e7f1),
    surfaceContainerHighest = Color(0xffe3e1eb), surfaceTint = Color(0xff2b50c8),
    outlineVariant = Color(0xffc7c5d0), outline = Color(0xff777680),
    error = Color(0xffba1a1a), onError = Color.White,
    errorContainer = Color(0xffffdad6), onErrorContainer = Color(0xff410002),
    inverseSurface = Color(0xff303038), inverseOnSurface = Color(0xfff2f0fa), inversePrimary = Color(0xffb8c4ff),
    scrim = Color.Black
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
    surfaceDim = Color(0xff121318), surfaceBright = Color(0xff383940),
    surfaceContainerLowest = Color(0xff0d0e13), surfaceContainerLow = Color(0xff1a1b23),
    surfaceContainer = Color(0xff1e1f27), surfaceContainerHigh = Color(0xff282a32),
    surfaceContainerHighest = Color(0xff33343d), surfaceTint = Color(0xffb8c4ff),
    outlineVariant = Color(0xff46464f), outline = Color(0xff918f9a),
    error = Color(0xffffb4ab), onError = Color(0xff690005),
    errorContainer = Color(0xff93000a), onErrorContainer = Color(0xffffdad6),
    inverseSurface = Color(0xffe4e1e9), inverseOnSurface = Color(0xff303038), inversePrimary = Color(0xff2b50c8),
    scrim = Color.Black
)

private val PodListTypography = Typography(
    headlineLarge = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Medium, fontSize = 30.sp, lineHeight = 38.sp),
    headlineMedium = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Medium, fontSize = 26.sp, lineHeight = 34.sp),
    headlineSmall = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Medium, fontSize = 22.sp, lineHeight = 30.sp),
    titleLarge = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Medium, fontSize = 20.sp, lineHeight = 28.sp),
    titleMedium = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Medium, fontSize = 17.sp, lineHeight = 24.sp),
    titleSmall = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Medium, fontSize = 14.sp, lineHeight = 20.sp),
    bodyLarge = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 21.sp),
    bodySmall = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Normal, fontSize = 12.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Medium, fontSize = 14.sp, lineHeight = 20.sp),
    labelMedium = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Medium, fontSize = 12.sp, lineHeight = 18.sp),
    labelSmall = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Medium, fontSize = 12.sp, lineHeight = 16.sp)
)

@Composable
fun PodListTheme(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val manager = remember(context) { context.getSystemService(UiModeManager::class.java) }
    var contrast by remember(manager) { mutableFloatStateOf(manager.contrast) }
    DisposableEffect(manager) {
        val listener = UiModeManager.ContrastChangeListener { contrast = it }
        manager.addContrastChangeListener(ContextCompat.getMainExecutor(context), listener)
        onDispose { manager.removeContrastChangeListener(listener) }
    }
    val dark = isSystemInDarkTheme()
    val base = if (dark) DarkColors else LightColors
    val amount = contrast.coerceIn(0f, 1f)
    val colors = base.copy(
        primary = lerp(base.primary, if (dark) Color(0xffe0e5ff) else Color(0xff002781), amount),
        onSurfaceVariant = lerp(base.onSurfaceVariant, base.onSurface, amount),
        outline = lerp(base.outline, base.onSurface, amount),
        outlineVariant = lerp(base.outlineVariant, base.onSurfaceVariant, amount)
    )
    MaterialTheme(
        colorScheme = colors,
        typography = PodListTypography,
        content = content
    )
}
