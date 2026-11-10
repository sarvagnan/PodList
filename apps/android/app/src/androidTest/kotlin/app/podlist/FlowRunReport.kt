package app.podlist

import android.app.Instrumentation
import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.view.PixelCopy
import android.view.ViewTreeObserver
import androidx.test.platform.app.InstrumentationRegistry
import android.graphics.Rect as AndroidRect
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import android.util.Log
import android.view.FrameMetrics
import android.view.Window
import android.view.WindowInsets
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.semantics.*
import androidx.test.uiautomator.UiDevice
import java.io.File
import java.io.PrintWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.max

/** CSV rows are evidence, not assertions. Missing core kinds are explicit absent rows. */
internal class FlowRunReport(private val instrumentation: Instrumentation, private val device: UiDevice) {
    val runId: String = SimpleDateFormat("yyyyMMdd-HHmmss-SSS", Locale.US).format(Date())
    val directory = File(requireNotNull(instrumentation.targetContext.getExternalFilesDir(null)), "flow-run/$runId").apply { check(mkdirs()) }
    private val measurements = File(directory, "measurements.csv").printWriter()
    private val timings = File(directory, "timings.csv").printWriter()
    private val frames = File(directory, "frames.csv").printWriter()
    private val findings = mutableListOf<String>()
    private val notes = mutableListOf<String>()
    private val samples = mutableListOf<TimingRow>()
    private var sequence = 0
    private var previous: Snapshot? = null
    private var failed: String? = null
    private val audit = FlowRunClassification.Audit()
    private var inputSerial = 0L
    private var intent = FlowRunClassification.Intent.NONE
    private var editedField: String? = null
    private var submittedFields = emptySet<String>()
    private val debuggable = instrumentation.targetContext.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
    private val emulator = Build.FINGERPRINT.contains("generic") || Build.MODEL.contains("sdk", true) || Build.HARDWARE in setOf("goldfish", "ranchu")
    private val footResults = mutableListOf<Pair<String, String>>()
    private var activeTiming: TimedInput? = null
    private var validPendingProbes = 0
    private var invalidPendingProbes = 0
    fun beginAction(step: String) { intent = FlowRunClassification.intent(step) }
    fun dispatched(field: String? = null) {
        inputSerial++
        editedField = field
        if (field != null) submittedFields = submittedFields - field
        else if (intent == FlowRunClassification.Intent.SUBMIT) submittedFields = previous?.typed?.keys.orEmpty()
        activeTiming?.dispatched()
    }
    private val density = instrumentation.targetContext.resources.displayMetrics.density
    init {
        csv(measurements, "row", "flow", "step", "appearance", "pass", "width_px", "screen_width_dp", "element", "label", "present", "root_x_px", "root_y_px", "root_width_px", "root_height_px", "window_x_px", "window_y_px", "window_width_px", "window_height_px", "x_dp", "y_dp", "width_dp", "height_dp", "delta_x_px", "delta_y_px", "delta_width_px", "delta_height_px", "delta_x_dp", "delta_y_dp", "delta_width_dp", "delta_height_dp", "input_age_ms", "person_caused", "focus", "scroll_axes", "visible_first_item", "typed_values", "follow_up_visible", "visible_window", "ime_px", "screenshot", "screen_identity", "phase", "input_serial", "intent", "async_pending", "edited_field", "submitted_fields")
        csv(timings, "flow", "step", "appearance", "pass", "first_response_upper_ms", "busy_first_observed_ms", "settle_upper_ms", "pixel_sample_gap_max_ms", "method", "responded", "first_response_lower_ms", "draws", "confirmed_frames", "unresolved_frames")
        csv(frames, "flow", "appearance", "frame", "total_ms", "deadline_ms", "late", "estimated_missed_vsyncs", "listener_drops")
        Log.i("FlowRun", "Output: ${directory.absolutePath}")
    }
    fun nextSequence() = ++sequence
    fun note(text: String) { notes += text }
    private data class Element(val id: String, val label: String, val root: Rect, val window: Rect, val node: SemanticsNode? = null)
    private data class Snapshot(val flow: String, val appearance: String, val pass: Int, val step: String, val elements: Map<String, Element>, val focus: String, val scroll: String, val typed: Map<String, String>, val row: Int, val png: String)
    private fun directText(node: SemanticsNode): String = node.config.getOrNull(SemanticsProperties.ContentDescription)?.joinToString(" ")
        ?: node.config.getOrNull(SemanticsProperties.Text)?.joinToString(" ") { it.text }.orEmpty()
    // Unmerged button/navigation parents carry their role while their children carry the label.
    private fun text(node: SemanticsNode): String = directText(node).ifBlank {
        node.flatten().drop(1).map(::directText).firstOrNull { it.isNotBlank() }.orEmpty()
    }
    private val inputLabels = setOf("Server address", "Podcast name or feed address", "Search Episodes", "Search the Library", "Name")
    private fun fieldLabel(node: SemanticsNode): String = node.flatten().flatMap { it.config.getOrNull(SemanticsProperties.Text).orEmpty() }
        .map { it.text }.firstOrNull { it in inputLabels } ?: text(node).ifBlank { "unlabelled-${node.id}" }
    private fun union(rects: List<Rect>): Rect = Rect(rects.minOf { it.left }, rects.minOf { it.top }, rects.maxOf { it.right }, rects.maxOf { it.bottom })
    private fun block(id: String, nodes: List<SemanticsNode>): Element? = nodes.takeIf { it.isNotEmpty() }?.let {
        Element(id, it.map(::text).distinct().joinToString(" | "), union(it.map { n -> n.boundsInRoot }), union(it.map { n -> n.boundsInWindow }))
    }
    private fun actionHandle(label: String): String = when (label) {
        "Checking server…" -> "Check and connect"
        "Subscribing…" -> "Subscribe"
        else -> label
    }
    private val actionLabels = setOf("Check and connect", "Find podcasts", "Subscribe", "Save", "Create Playlist", "Create View", "Save as a View", "Add to a Playlist", "Play Last", "Rename", "New Playlist", "Add podcasts", "Search the Library", "Move up", "Move down", "Undo")

    fun capture(flow: String, step: String, appearance: String, pass: Int, inputAt: Long, nodes: List<SemanticsNode>, window: Window, pending: Boolean) {
        // Timed passes write timings only. Their screenshot sampling is measured separately.
        if (pass > 0) return
        val now = SystemClock.uptimeMillis()
        val row = nextSequence()
        val age = if (inputAt == Long.MIN_VALUE) Long.MAX_VALUE else now - inputAt
        val caused = age in 0..500
        val visibleNodes = nodes.distinctBy { it.id }.filter { it.boundsInWindow.width > 0 && it.boundsInWindow.height > 0 }
        val elements = mutableListOf<Element>()
        val fields = visibleNodes.filter { it.config.getOrNull(SemanticsProperties.EditableText) != null }
        fields.forEach { node ->
            val label = fieldLabel(node)
            elements += Element("input:$label", label, node.boundsInRoot, node.boundsInWindow, node)
        }
        visibleNodes.filter { it.config.getOrNull(SemanticsProperties.Heading) != null }.sortedBy { it.boundsInWindow.top }.forEachIndexed { index, node ->
            elements += Element("heading:$index", text(node), node.boundsInRoot, node.boundsInWindow, node)
        }
        visibleNodes.filter { node ->
            node.config.getOrNull(SemanticsActions.OnClick) != null && (text(node) in actionLabels || node.config.getOrNull(SemanticsProperties.Role) == Role.Button)
        }.distinctBy { text(it) to it.boundsInWindow }.forEach { node ->
            // Semantic labels persist across changing enabled/busy states. Include every candidate
            // action so the report does not silently miss a primary action after a UI revision.
            val handle = actionHandle(text(node))
            val index = elements.count { it.id.startsWith("action:$handle:") }
            elements += Element("action:$handle:$index", text(node), node.boundsInRoot, node.boundsInWindow, node)
        }
        val navigation = visibleNodes.filter { node ->
            text(node) in setOf("Views", "Playlists", "Library") && node.config.getOrNull(SemanticsProperties.Role) == Role.Tab && node.config.getOrNull(SemanticsProperties.Selected) != null
        }
        block("bottom-navigation", navigation)?.let(elements::add)
        navigation.forEach { node ->
            val label = text(node)
            elements += Element("navigation:$label", "$label; selected=${node.config[SemanticsProperties.Selected]}", node.boundsInRoot, node.boundsInWindow, node)
        }
        // Now Playing's labelled artwork has a stable clickable ancestor for the 72dp mini player.
        val mini = visibleNodes.firstOrNull { text(it).startsWith("Now Playing:") }
        mini?.let { n ->
            val container = generateSequence(n) { it.parent }.firstOrNull { it.boundsInWindow.height >= 60 * density && it.boundsInWindow.height <= 90 * density && it.boundsInWindow.width >= device.displayWidth * .8f } ?: n
            elements += Element("mini-player", text(n), container.boundsInRoot, container.boundsInWindow, container)
        }
        // Snackbar provides PaneTitle in Material 3. Fall back to Undo/Retry's parent surface.
        val snackbar = visibleNodes.firstOrNull { it.config.getOrNull(SemanticsProperties.PaneTitle)?.contains("Snackbar", true) == true }
            ?: visibleNodes.firstOrNull { text(it) == "Undo" && it.config.getOrNull(SemanticsActions.OnClick) != null && it.config.getOrNull(SemanticsProperties.ContentDescription) == null }
                ?.let { n -> generateSequence(n) { it.parent }.firstOrNull { it.boundsInWindow.width > device.displayWidth * .65f && it.boundsInWindow.height < 200 * density } ?: n.parent ?: n }
        snackbar?.let { elements += Element("snackbar", text(it).ifBlank { it.flatten().joinToString(" | ", transform = ::text) }, it.boundsInRoot, it.boundsInWindow, it) }
        val focus = visibleNodes.filter { it.config.getOrNull(SemanticsProperties.Focused) == true }.joinToString(" | ") { if (it.config.getOrNull(SemanticsProperties.EditableText) != null) fieldLabel(it) else text(it).ifBlank { "node:${it.id}" } }
        val typed = fields.associate { fieldLabel(it) to it.config[SemanticsProperties.EditableText].text }
        val scrollNodes = visibleNodes.filter { it.config.getOrNull(SemanticsProperties.VerticalScrollAxisRange) != null }
        val scroll = scrollNodes.joinToString(" | ") { node ->
            val range = node.config[SemanticsProperties.VerticalScrollAxisRange]
            "${node.id}:${range.value()}/${range.maxValue()}"
        }
        val scrollPosition = scrollNodes.joinToString(" | ") { "${it.id}:${it.config[SemanticsProperties.VerticalScrollAxisRange].value()}" }
        val firstItem = scrollNodes.joinToString(" | ") { list ->
            val item = list.children.firstOrNull { it.boundsInWindow.bottom > list.boundsInWindow.top && it.boundsInWindow.top < list.boundsInWindow.bottom }
            "list:${list.id}:${item?.flatten()?.map(::text)?.firstOrNull { it.isNotBlank() }.orEmpty()}"
        }
        val visible = AndroidRect()
        var ime = 0
        var imeTop = device.displayHeight
        instrumentation.runOnMainSync {
            window.decorView.getWindowVisibleDisplayFrame(visible)
            ime = window.decorView.rootWindowInsets?.getInsets(WindowInsets.Type.ime())?.bottom ?: 0
            if (ime > 0) imeTop = window.decorView.height - ime
        }
        val viewport = Rect(visible.left.toFloat(), visible.top.toFloat(), visible.right.toFloat(), minOf(visible.bottom, imeTop).toFloat())
        val occluders = elements.filter { it.id in setOf("bottom-navigation", "mini-player", "snackbar") }
        val followUps = elements.filter { it.label == "Undo" || it.label.startsWith("Retry") || it.id == "snackbar" }
        val visibility = followUps.associate { element ->
            // Ancestors of the follow-up (its own snackbar) are not occluders.
            val box = element.window
            val inViewport = box.left >= viewport.left - 2 && box.top >= viewport.top - 2 && box.right <= viewport.right + 2 && box.bottom <= viewport.bottom + 2
            // The snackbar host draws above the navigation bar, mini player and sheets, so a snackbar or anything
            // inside it is never under them; only the viewport and keyboard can hide it.
            val inSnackbar = element.id == "snackbar" || snackbar?.flatten()?.any { it.id == element.node?.id } == true
            val covered = !inSnackbar && occluders.any { bar -> bar.id != element.id && overlaps(box, bar.window) }
            element.id to (inViewport && !covered)
        }
        val screenshot = "$flow-${row.toString().padStart(4, '0')}-$step-${appearance.lowercase()}.png"
        check(device.takeScreenshot(File(directory, screenshot))) { "Could not capture $screenshot" }
        val old = previous?.takeIf { it.flow == flow && it.appearance == appearance && it.pass == pass }
        val screen = FlowRunClassification.screen(elements.filter { it.id.startsWith("heading:") }.map { it.label }, typed.keys)
        val phase = FlowRunClassification.phase(step)
        val current = Snapshot(flow, appearance, pass, step, elements.associateBy { it.id }, focus, scrollPosition, typed, row, screenshot)
        elements.forEach { element ->
            val before = old?.elements?.get(element.id)
            val deltas = before?.let { listOf(element.root.left - it.root.left, element.root.top - it.root.top, element.root.width - it.root.width, element.root.height - it.root.height) }
            csv(measurements, row, flow, step, appearance, pass, device.displayWidth, device.displayWidth / density, element.id, element.label, true,
                element.root.left, element.root.top, element.root.width, element.root.height, element.window.left, element.window.top, element.window.width, element.window.height,
                element.root.left / density, element.root.top / density, element.root.width / density, element.root.height / density,
                deltas?.get(0), deltas?.get(1), deltas?.get(2), deltas?.get(3), deltas?.get(0)?.div(density), deltas?.get(1)?.div(density), deltas?.get(2)?.div(density), deltas?.get(3)?.div(density),
                age.takeUnless { it == Long.MAX_VALUE }, caused, focus, scroll, firstItem, typed.entries.joinToString(" | ") { "${it.key}=${it.value}" }, visibility[element.id], viewport, ime, screenshot, screen, phase, inputSerial, intent, pending, editedField, submittedFields.joinToString(" | "))
            if (visibility[element.id] == false) findings += "FLOW-04 $appearance $flow/$step, ${element.id}: bounds=${element.window}, visible=$viewport, IME=$ime px; measurements.csv row $row; PNG pair [${old?.png ?: screenshot}](${old?.png ?: screenshot}) → [$screenshot]($screenshot)."
        }
        for (kind in listOf("input", "action", "heading", "bottom-navigation", "mini-player", "snackbar")) {
            if (elements.none { it.id == kind || it.id.startsWith("$kind:") }) {
                csv(measurements, row, flow, step, appearance, pass, device.displayWidth, device.displayWidth / density, kind, "absent on this screen", false,
                    null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                    age.takeUnless { it == Long.MAX_VALUE }, caused, focus, scroll, firstItem, typed.entries.joinToString(), null, viewport, ime, screenshot, screen, phase, inputSerial, intent, pending, editedField, submittedFields.joinToString(" | "))
            }
        }
        audit.add(FlowRunClassification.State(row, flow, appearance, step, screenshot, screen, phase, intent,
            inputSerial, age.takeUnless { it == Long.MAX_VALUE }, elements.associate { it.id to FlowRunClassification.Box(it.root.left / density, it.root.top / density) },
            focus, scrollPosition, typed, pending, editedField, submittedFields, elements.associate { it.id to it.label }))
        previous = current
        measurements.flush()
        check(!measurements.checkError()) { "Failed writing measurements.csv" }
    }
    private fun overlaps(a: Rect, b: Rect) = a.left < b.right - 2 && a.right > b.left + 2 && a.top < b.bottom - 2 && a.bottom > b.top + 2

    inner class PendingProbe {
        private var typed: String? = null
        private var at = 0L
        private var wasPending = false
        fun typed(value: String?, time: Long, pending: Int) {
            typed = value; at = time; wasPending = pending > 0
            if (!wasPending) invalidPendingProbes++
            note("FLOW-03 $appearanceForProbe pending typing: '$value', transport pending=$pending at $time ms; see C/typing-pending.")
            if (pending == 0) note("N/O FLOW-03: transport finished before the probe typed; inspect C/typing-pending.")
        }
        fun completed(value: String?, time: Long) {
            if (wasPending) validPendingProbes++
            if (typed != value) note("FLOW-03 $appearanceForProbe C/subscribe-completion Search Episodes: '$typed' → '$value', ${time - at} ms after typing; see C typing-pending/subscribe-completion rows.")
            else note("FLOW-03 $appearanceForProbe C: '$value' survived Subscribe completion, observed ${time - at} ms after typing.")
        }
        private val appearanceForProbe = previous?.appearance.orEmpty()
    }
    fun startPendingProbe() = PendingProbe()

    data class TimingRow(val flow: String, val step: String, val appearance: String, val pass: Int,
        val response: Double?, val lower: Double?, val busy: Double?, val settle: Double, val gap: Double, val row: Int)
    fun startTiming(flow: String, step: String, appearance: String, pass: Int, window: Window) =
        TimedInput(flow, step, appearance, pass, window).also { activeTiming = it }

    /** Timestamp actual traversals, then confirm their pixels using asynchronous PixelCopy.
     * A copy spanning several draws is an interval, never a fabricated presentation timestamp.
     * Only consecutive unchanged confirmations can establish a lower bound for a failure. */
    inner class TimedInput(private val flow: String, private val step: String, private val appearance: String,
        private val pass: Int, private val window: Window) : AutoCloseable {
        private val thread = HandlerThread("FlowRun-response-frames").apply { start() }
        private val handler = Handler(thread.looper)
        private val area = AndroidRect()
        private val inFlight = AtomicBoolean(false)
        private val drawCount = AtomicLong(0)
        private val lastDraw = AtomicLong(0)
        @Volatile private var start = 0L
        @Volatile private var initial: Long? = null
        @Volatile private var response: Double? = null
        private var lower: Double? = null
        private var busyAt: Double? = null
        private var settle = 0.0
        private var lastConfirmed = 0L
        @Volatile private var copyDone = java.util.concurrent.CountDownLatch(0)
        private var unchangedAt = 0L
        private var confirmed = 0
        private var unresolved = 0
        private var maxGap = 0.0
        @Volatile private var closed = false
        private val drawListener = ViewTreeObserver.OnDrawListener {
            val at = System.nanoTime()
            lastDraw.set(at)
            val frame = drawCount.incrementAndGet()
            // Post after traversal so PixelCopy reads the submitted surface, not its predecessor.
            if (start != 0L && response == null && inFlight.compareAndSet(false, true)) {
                window.decorView.post { copy(frame, at) }
            }
        }
        init {
            instrumentation.runOnMainSync {
                window.decorView.getWindowVisibleDisplayFrame(area)
                area.bottom = (area.bottom - 140 * density).toInt().coerceAtLeast(area.top + 1)
            }
            // One baseline copy, before dispatch; do not put screenshot cost on the input clock.
            val ready = java.util.concurrent.CountDownLatch(1)
            copyPixels { hash -> initial = hash; ready.countDown() }
            check(ready.await(5, java.util.concurrent.TimeUnit.SECONDS)) { "Baseline PixelCopy did not return" }
            instrumentation.runOnMainSync { window.decorView.viewTreeObserver.addOnDrawListener(drawListener) }
        }
        fun dispatched() {
            // Called inside the semantics action on the UI thread, after Compose's idle wait.
            if (start == 0L) { lastConfirmed = drawCount.get(); start = System.nanoTime() }
        }
        private fun copy(frame: Long, at: Long) {
            if (closed) { inFlight.set(false); return }
            val finished = java.util.concurrent.CountDownLatch(1)
            copyDone = finished
            copyPixels { hash ->
                val endFrame = drawCount.get()
                val endAt = lastDraw.get()
                confirmed++
                if (start != 0L && initial != null && hash != null) {
                    val upper = (endAt - start) / 1e6
                    maxGap = max(maxGap, (endAt - max(start, unchangedAt)) / 1e6)
                    if (hash != initial && response == null) {
                        response = upper
                        lower = if (frame == lastConfirmed + 1 && endFrame == frame && unresolved == 0) (max(start, unchangedAt) - start) / 1e6 else 0.0
                    } else if (hash == initial) {
                        // A changed transient may have been skipped when multiple draws overlap a copy.
                        if (endFrame != frame || frame != lastConfirmed + 1) unresolved++
                        unchangedAt = at
                    }
                    lastConfirmed = endFrame
                } else unresolved++
                inFlight.set(false)
                finished.countDown()
            }
        }
        private fun copyPixels(done: (Long?) -> Unit) {
            val bitmap = Bitmap.createBitmap(max(1, area.width() / 4), max(1, area.height() / 4), Bitmap.Config.ARGB_8888)
            PixelCopy.request(window, area, bitmap, { result ->
                try {
                    if (result != PixelCopy.SUCCESS) done(null)
                    else {
                        val pixels = IntArray(bitmap.width * bitmap.height)
                        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
                        var hash = 1125899906842597L
                        pixels.forEach { hash = hash * 31 + it }
                        done(hash)
                    }
                } finally { bitmap.recycle() }
            }, handler)
        }
        fun inputReturned(busy: Boolean) {
            if (start != 0L && busy && busyAt == null) busyAt = (System.nanoTime() - start) / 1e6
        }
        fun settled() { if (start != 0L) settle = (System.nanoTime() - start) / 1e6 }
        override fun close() {
            instrumentation.runOnMainSync {
                closed = true
                window.decorView.viewTreeObserver.removeOnDrawListener(drawListener)
            }
            check(copyDone.await(5, java.util.concurrent.TimeUnit.SECONDS)) { "In-flight PixelCopy did not finish" }
            val drained = java.util.concurrent.CountDownLatch(1)
            handler.post { drained.countDown() }
            check(drained.await(5, java.util.concurrent.TimeUnit.SECONDS)) { "Response callback queue did not drain" }
            thread.quitSafely(); thread.join(5_000)
            activeTiming = null
            if (settle == 0.0 && start != 0L) settle = (System.nanoTime() - start) / 1e6
            val sample = TimingRow(flow, step, appearance, pass, response, lower, busyAt, settle, maxGap, samples.size + 2)
            samples += sample
            csv(timings, flow, step, appearance, pass, response, busyAt, settle, maxGap,
                "OnDraw/System.nanoTime + PixelCopy; response interval; not presentation time", response != null, lower, drawCount.get(), confirmed, unresolved)
            timings.flush()
            check(!timings.checkError()) { "Failed writing timings.csv" }
        }
    }

    fun scrollFrames(flow: String, appearance: String, window: Window, fling: () -> Unit) {
        val thread = HandlerThread("FlowRun-frame-metrics").apply { start() }
        val handler = Handler(thread.looper)
        val data = CopyOnWriteArrayList<Triple<Long, Long, Int>>()
        var refresh = 60f
        instrumentation.runOnMainSync { refresh = window.decorView.display.refreshRate }
        val budget = (1e9 / refresh).toLong()
        val listener = Window.OnFrameMetricsAvailableListener { _, metric, dropped ->
            // Copy values inside callback: Android reuses FrameMetrics for later frames.
            val total = metric.getMetric(FrameMetrics.TOTAL_DURATION)
            val deadline = metric.getMetric(FrameMetrics.DEADLINE).takeIf { it > 0 } ?: budget
            data += Triple(total, deadline, dropped)
        }
        instrumentation.runOnMainSync { window.addOnFrameMetricsAvailableListener(listener, handler) }
        try { fling(); device.waitForIdle(2_000) }
        finally {
            instrumentation.runOnMainSync { window.removeOnFrameMetricsAvailableListener(listener) }
            val drained = java.util.concurrent.CountDownLatch(1)
            handler.post { drained.countDown() }
            check(drained.await(2, java.util.concurrent.TimeUnit.SECONDS)) { "FrameMetrics callback queue did not drain" }
            thread.quitSafely(); thread.join(2_000)
        }
        data.forEachIndexed { index, (total, deadline, dropped) ->
            csv(frames, flow, appearance, index, total / 1e6, deadline / 1e6, total > deadline, (ceil(total.toDouble() / budget).toInt() - 1).coerceAtLeast(0), dropped)
        }
        frames.flush()
        check(!frames.checkError()) { "Failed writing frames.csv" }
        val late = data.count { it.first > it.second }
        note("FOOT-02 $appearance C/long-list-fling: ${data.size} rendered frames at $refresh Hz; $late exceed platform deadline, ${data.sumOf { it.third }} listener samples dropped. Raw frames.csv. Listener drops are missing observations, not display frame drops.")
        footResults += appearance to FlowRunClassification.footVerdict(debuggable, emulator, data.size, late)
        if (!debuggable && !emulator && late > 0) findings += "FOOT-02 $appearance C/long-list-fling: $late/${data.size} frames missed the platform deadline (refresh=$refresh Hz); frame rows in frames.csv."
    }
    fun failure(error: Throwable) { failed = error.stackTraceToString() }
    fun finish(success: Boolean) {
        measurements.close(); timings.close(); frames.close()
        File(directory, "summary.md").writeText(buildString {
            appendLine("# PodList Android flow run $runId")
            appendLine("Flows complete: $success. ${Build.MANUFACTURER} ${Build.MODEL}, Android ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT}), ${device.displayWidth}×${device.displayHeight} px, density=$density. Width is the device's current phone width; no CPU/network throttling. Delayed passes: 2000 ms per HTTP completion; timed passes: no added delay, five per appearance. Appearance changed using app Settings.")
            appendLine("Build: ${if (debuggable) "debuggable" else "non-debuggable"}; device: ${if (emulator) "emulator on Mac host (host declared by run procedure)" else "physical device"}. Emulator/debug measurements do not establish audience-hardware responsiveness. footBuild=${InstrumentationRegistry.getArguments().getString("footBuild", "default")}.")
            appendLine("\n## Verdicts")
            appendLine("| Check | Verdict and counts | Key evidence |")
            appendLine("|---|---|---|")
            for (check in listOf("FLOW-01", "FLOW-02", "FLOW-03")) {
                val failures = audit.findings().filter { it.check == check }
                val unknown = audit.comparisons.filter { it.check == check && it.verdict == "N/O" }
                val verdict = if (failures.isNotEmpty()) "fail" else if (!success || unknown.isNotEmpty() || check == "FLOW-03" && (validPendingProbes < 2 || invalidPendingProbes > 0)) "N/O" else "pass"
                appendLine("| $check | $verdict; ${failures.size} findings, ${unknown.size} unresolved; ${audit.raw.count { it.check == check }} raw candidates | ${(failures.firstOrNull() ?: unknown.firstOrNull())?.evidence() ?: audit.probeEvidence()} |")
            }
            appendLine("| FLOW-04 | ${if (findings.any { it.startsWith("FLOW-04") }) "fail" else if (success) "pass" else "N/O"}; ${findings.count { it.startsWith("FLOW-04") }} visibility findings | ${findings.firstOrNull { it.startsWith("FLOW-04") } ?: "measurements.csv follow_up_visible"} |")
            for (check in listOf("FLOW-05", "FLOW-06", "FLOW-07")) appendLine("| $check | N/O; not measured by this harness | phone strip; no peer-panel/cross-screen audit |")
            val responseVerdicts = samples.groupBy { Triple(it.appearance, it.flow, it.step) }.values.map { responseVerdict(it) }
            appendLine("| RESP-01 | ${if (debuggable || emulator || responseVerdicts.isEmpty()) "N/O" else if (responseVerdicts.any { it == "fail" }) "fail" else if (responseVerdicts.all { it == "pass" }) "pass" else "N/O"}; ${responseVerdicts.size} step groups; ${responseVerdicts.count { it.startsWith("N/O") }} unresolved frame intervals | timings.csv row ${samples.firstOrNull()?.row ?: "unavailable"}; see per-step intervals below; audience hardware unverified |")
            appendLine("| FOOT-02 | ${footResults.joinToString { "${it.first}: ${it.second}" }.ifBlank { "N/O: no samples" }} | frames.csv row 2 |")
            appendLine("\n## Findings")
            if (findings.isEmpty() && audit.findings().isEmpty()) appendLine("No confirmed failures; unresolved comparisons are N/O below.")
            findings.distinct().forEach { appendLine("- $it") }
            appendLine(audit.summary())
            appendLine("\n## RESP-01: nearest-rank 75th percentile, five runs per appearance")
            appendLine("| Appearance | Flow/step | n | Response interval p75 ms | Busy observed p75 ms | Settle upper ms | Max sample gap ms | Verdict |")
            appendLine("|---|---|---:|---:|---:|---:|---:|---|")
            samples.groupBy { Triple(it.appearance, it.flow, it.step) }.forEach { (key, rows) ->
                val responses = rows.mapNotNull { it.response }
                val p75 = percentile(responses)
                val verdict = if (debuggable || emulator) "N/O: debug/emulator; frame interval evidence: ${responseVerdict(rows)}" else responseVerdict(rows)
                appendLine("| ${key.first} | ${key.second}/${key.third} | ${rows.size} | ${percentile(rows.mapNotNull { it.lower })?.let(::fmt) ?: "N/O"}–${p75?.let(::fmt) ?: "N/O"} | ${percentile(rows.mapNotNull { it.busy })?.let(::fmt) ?: "unobserved"} | ${fmt(percentile(rows.map { it.settle })!!)} | ${fmt(rows.maxOf { it.gap })} | $verdict; timings.csv rows ${rows.joinToString { it.row.toString() }} |")
                rows.filter { it.settle > 1_000 && (it.busy == null || it.busy > 1_000) }.forEach {
                    appendLine("\n- RESP-01 ${it.appearance} ${it.flow}/${it.step} run ${it.pass}: settles in ${fmt(it.settle)} ms, busy ${it.busy?.let(::fmt) ?: "not observed"} ms; N/O for 1 s busy deadline (observation upper bound). timings.csv row ${it.row}.")
                }
                rows.filter { it.settle > 10_000 }.forEach { appendLine("\n- RESP-01/CTRL-08 ${it.flow}/${it.step} run ${it.pass}: ${fmt(it.settle)} ms; manually check progress/estimate/cancel in capture.") }
            }
            appendLine("\n## Coverage notes")
            notes.distinct().forEach { appendLine("- $it") }
            appendLine("Stability sub-score: evidence supplied as per-step rows and PNG pairs; no rubric score is invented by this regression test. Guideline findings do not fail JUnit; missing flows, screenshots or required server/feed arguments do. Pixel timing cannot see a transient pressed frame between screenshots, distinguish caret blinking from acknowledgment, or time below the excluded bottom region; those require device trace/manual review.")
            appendLine("\n## Method")
            appendLine("FLOW-01 uses settled captures after waitForIdle, compared to the previous settled capture on the same heading/screen; pending→completion is additionally compared without intervening input. Input frames stay in the strip and raw CSV, never a FLOW-01 comparison. Core top/left tolerance is 2 dp. A snapshot's input age is not the change onset: unresolved action effects are N/O. Explicit navigation, scroll, keyboard, focus, edits and own-submit cleanup are excluded; late completions remain unprompted after 500 ms. FLOW-03 protects unsubmitted text edited while a response was pending. Every raw candidate exclusion and reason is listed above. Semantics and PNG are sequential, not atomic.")
            appendLine("Float physical bounds and dp, focus, raw scroll axes/first item, text, IME and follow-up geometry remain in measurements.csv. Scroll node IDs are normalized for settled comparisons. FLOW-04 geometry checks remain raw-capture observations, allowing 2 px rounding; inspect PNGs for overlays.")
            appendLine("RESP-01: OnDrawListener records System.nanoTime at each app-window draw, armed within dispatched semantics actions (after Compose synchronization). Asynchronous PixelCopy confirms changed task-content pixels at quarter resolution, excluding system bars/bottom 140 dp. The upper bound is the last draw before copy completion; the lower bound needs consecutive unchanged confirmations without skipped draws. Overlapping/skipped draws give a zero lower bound, so cannot establish a >200 ms failure. Precision is a draw interval (typically one refresh interval when confirmed consecutively), not ns presentation accuracy. Missing observations, a straddled 200 ms limit or fewer than five runs are N/O. Caret/unrelated animation, excluded chrome and absent busy observations need review. Busy and settle remain observation upper bounds; late observation never proves a missing busy indicator. mainClock.autoAdvance=true. No CPU/network throttling; delayed stability passes add 2000 ms per HTTP completion.")
            appendLine("FOOT-02 keeps Window FrameMetrics total/deadline nanoseconds and callback drops in frames.csv. Verdict requires a non-debuggable build on a physical device; footBuild=release-like is a path note, never an override. Audience representativeness still needs review.")
            failed?.let { appendLine("\n## Test failure\n```\n$it\n```") }
        })
    }
    private fun responseVerdict(rows: List<TimingRow>): String = FlowRunClassification.responseVerdict(
        percentile(rows.mapNotNull { it.response }), percentile(rows.mapNotNull { it.lower }),
        rows.count { it.response != null && it.lower != null })
    private fun percentile(values: List<Double>): Double? = values.sorted().takeIf { it.isNotEmpty() }?.let { it[ceil(it.size * .75).toInt() - 1] }
    private fun fmt(value: Float) = String.format(Locale.US, "%.2f", value)
    private fun fmt(value: Double) = String.format(Locale.US, "%.2f", value)
    private fun csv(writer: PrintWriter, vararg values: Any?) = writer.println(values.joinToString(",") { "\"${it?.toString().orEmpty().replace("\"", "\"\"")}\"" })
}
