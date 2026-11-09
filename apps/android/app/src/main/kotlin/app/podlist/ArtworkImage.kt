package app.podlist

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.LruCache
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URI
import java.security.MessageDigest

private val artworkMemory = object : LruCache<String, Bitmap>(8 * 1024 * 1024) {
    override fun sizeOf(key: String, value: Bitmap) = value.allocationByteCount
}

/** Artwork always uses the documented Library-only proxy, with bounded memory/disk caches. */
@Composable
internal fun ArtworkImage(session: Session, url: String?, size: androidx.compose.ui.unit.Dp = 40.dp) {
    val context = LocalContext.current
    val bitmap by produceState<Bitmap?>(null, session.address.origin, url) {
        value = null
        if (url == null) return@produceState
        val endpoint = session.address.artwork(url, if (size > 100.dp) 512 else 128)
        value = withContext(Dispatchers.IO) {
            artworkMemory.get(endpoint) ?: runCatching {
                val key = MessageDigest.getInstance("SHA-256").digest(endpoint.toByteArray()).joinToString("") { "%02x".format(it) }
                val directory = File(context.cacheDir, "artwork").also { it.mkdirs() }
                val file = File(directory, key)
                val cached = if (file.exists()) BitmapFactory.decodeFile(file.path) else null
                cached ?: run {
                    val connection = URI(endpoint).toURL().openConnection() as HttpURLConnection
                    try {
                        connection.connectTimeout = 10_000
                        connection.readTimeout = 10_000
                        connection.instanceFollowRedirects = false
                        connection.setRequestProperty("User-Agent", "PodList Android")
                        if (connection.responseCode != 200) return@run null
                        val bytes = connection.inputStream.use { it.readNBytes(2 * 1024 * 1024 + 1) }
                        if (bytes.size > 2 * 1024 * 1024) return@run null
                        val decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return@run null
                        val temporary = File.createTempFile("artwork-", ".part", directory)
                        try { temporary.writeBytes(bytes); temporary.renameTo(file) } finally { temporary.delete() }
                        var total = 0L
                        directory.listFiles().orEmpty().sortedByDescending { it.lastModified() }.forEach {
                            total += it.length()
                            if (total > 64 * 1024 * 1024) it.delete()
                        }
                        decoded
                    } finally { connection.disconnect() }
                }
            }.getOrNull()?.also { artworkMemory.put(endpoint, it) }
        }
    }
    Box(Modifier.size(size).clip(RoundedCornerShape(4.dp)).background(MaterialTheme.colorScheme.secondaryContainer), contentAlignment = Alignment.Center) {
        if (bitmap != null) Image(bitmap!!.asImageBitmap(), contentDescription = null, modifier = Modifier.size(size), contentScale = ContentScale.Crop)
        else Icon(painterResource(R.drawable.ic_artwork), contentDescription = null, tint = MaterialTheme.colorScheme.onSecondaryContainer)
    }
}
