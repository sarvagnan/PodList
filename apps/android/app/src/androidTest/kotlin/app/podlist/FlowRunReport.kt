package app.podlist

import android.app.Instrumentation
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
    private val density = instrumentation.targetContext.resources.displayMetrics.density
    init {
        csv(measurements, "row", "flow", "step", "appearance", "pass", "width_px", "width_dp", "element", "label", "present", "root_x_px", "root_y_px", "root_width_px", "root_height_px", "window_x_px", "window_y_px", "window_width_px", "window_height_px", "x_dp", "y_dp", "width_dp", "height_dp", "delta_x_px", "delta_y_px", "delta_width_px", "delta_height_px", "delta_x_dp", "delta_y_dp", "delta_width_dp", "delta_height_dp", "input_age_ms", "person_caused", "focus", "scroll_axes", "visible_first_item", "typed_values", "follow_up_visible", "visible_window", "ime_px", "screenshot")
        csv(timings, "flow", "step", "appearance", "pass", "first_response_upper_ms", "busy_first_observed_ms", "settle_upper_ms", "pixel_sample_gap_max_ms", "method", "responded")
        csv(frames, "flow", "appearance", "frame", "total_ms", "deadline_ms", "late", "estimated_missed_vsyncs", "listener_drops")
        Log.i("FlowRun", "Output: ${directory.absolutePath}")
    }
    fun nextSequence() = ++sequence
    fun note(text: String) { notes += text }
    private data class Element(val id: String, val label: String, val root: Rect, val window: Rect, val node: SemanticsNode? = null)
    private data class Snapshot(val flow: String, val appearance: String, val pass: Int, val step: String, val elements: Map<String, Element>, val focus: String, val scroll: String, val typed: Map<String, String>, val row: Int)
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

    fun capture(flow: String, step: String, appearance: String, pass: Int, inputAt: Long, nodes: List<SemanticsNode>, window: Window) {
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
        block("bottom-navigation", visibleNodes.filter { node ->
            text(node) in setOf("Views", "Playlists", "Library") && node.config.getOrNull(SemanticsProperties.Selected) != null
        })?.let(elements::add)
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
            val covered = occluders.any { bar ->
                bar.id != element.id && !(bar.id == "snackbar" && snackbar?.flatten()?.any { it.id == element.node?.id } == true) && overlaps(box, bar.window)
            }
            element.id to (inViewport && !covered)
        }
        val screenshot = "$flow-${row.toString().padStart(4, '0')}-$step-${appearance.lowercase()}.png"
        check(device.takeScreenshot(File(directory, screenshot))) { "Could not capture $screenshot" }
        val old = previous?.takeIf { it.flow == flow && it.appearance == appearance && it.pass == pass }
        val current = Snapshot(flow, appearance, pass, step, elements.associateBy { it.id }, focus, scrollPosition, typed, row)
        elements.forEach { element ->
            val before = old?.elements?.get(element.id)
            val deltas = before?.let { listOf(element.root.left - it.root.left, element.root.top - it.root.top, element.root.width - it.root.width, element.root.height - it.root.height) }
            csv(measurements, row, flow, step, appearance, pass, device.displayWidth, device.displayWidth / density, element.id, element.label, true,
                element.root.left, element.root.top, element.root.width, element.root.height, element.window.left, element.window.top, element.window.width, element.window.height,
                element.root.left / density, element.root.top / density, element.root.width / density, element.root.height / density,
                deltas?.get(0), deltas?.get(1), deltas?.get(2), deltas?.get(3), deltas?.get(0)?.div(density), deltas?.get(1)?.div(density), deltas?.get(2)?.div(density), deltas?.get(3)?.div(density),
                age.takeUnless { it == Long.MAX_VALUE }, caused, focus, scroll, firstItem, typed.entries.joinToString(" | ") { "${it.key}=${it.value}" }, visibility[element.id], viewport, ime, screenshot)
            if (!caused && deltas != null && (abs(deltas[0]) > 2 * density || abs(deltas[1]) > 2 * density)) {
                findings += "FLOW-01 $appearance $flow/$step, ${element.id}: Δleft=${fmt(deltas[0])} px (${fmt(deltas[0] / density)} dp), Δtop=${fmt(deltas[1])} px (${fmt(deltas[1] / density)} dp); rows ${old.row} → $row, $screenshot."
            }
            if (visibility[element.id] == false) findings += "FLOW-04 $appearance $flow/$step, ${element.id}: bounds=${element.window}, visible=$viewport, IME=$ime px; row $row, $screenshot."
        }
        for (kind in listOf("input", "action", "heading", "bottom-navigation", "mini-player", "snackbar")) {
            if (elements.none { it.id == kind || it.id.startsWith("$kind:") }) {
                csv(measurements, row, flow, step, appearance, pass, device.displayWidth, device.displayWidth / density, kind, "absent on this screen", false,
                    null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                    age.takeUnless { it == Long.MAX_VALUE }, caused, focus, scroll, firstItem, typed.entries.joinToString(), null, viewport, ime, screenshot)
            }
        }
        if (!caused && old != null) {
            if (old.focus.isNotBlank() && focus != old.focus) findings += "FLOW-02 $appearance $flow/$step: focus '${old.focus}' → '$focus'; rows ${old.row} → $row."
            if (old.scroll != scrollPosition) findings += "FLOW-02 $appearance $flow/$step: scroll '${old.scroll}' → '$scrollPosition'; rows ${old.row} → $row (axis values are Compose units, not px)."
            old.typed.forEach { (key, value) ->
                if (value.isNotBlank() && typed[key] != value) findings += "FLOW-03 $appearance $flow/$step, $key: '$value' → '${typed[key]}'; rows ${old.row} → $row."
            }
        }
        previous = current
        measurements.flush()
        check(!measurements.checkError()) { "Failed writing measurements.csv" }
    }
    private fun overlaps(a: Rect, b: Rect) = a.left < b.right - 2 && a.right > b.left + 2 && a.top < b.bottom - 2 && a.bottom > b.top + 2

    inner class PendingProbe {
        private var typed: String? = null
        private var at = 0L
        fun typed(value: String?, time: Long, pending: Int) {
            typed = value; at = time
            note("FLOW-03 $appearanceForProbe pending typing: '$value', transport pending=$pending at $time ms; see C/typing-pending.")
            if (pending == 0) findings += "N/O FLOW-03: transport finished before the probe typed; inspect C/typing-pending."
        }
        fun completed(value: String?, time: Long) {
            if (typed != value) findings += "FLOW-03 $appearanceForProbe C/subscribe-completion Search Episodes: '$typed' → '$value', ${time - at} ms after typing; see C typing-pending/subscribe-completion rows."
            else note("FLOW-03 $appearanceForProbe C: '$value' survived Subscribe completion, observed ${time - at} ms after typing.")
        }
        private val appearanceForProbe = previous?.appearance.orEmpty()
    }
    fun startPendingProbe() = PendingProbe()

    data class TimingRow(val flow: String, val step: String, val appearance: String, val pass: Int, val response: Double?, val busy: Double?, val settle: Double, val gap: Double)
    fun startTiming(flow: String, step: String, appearance: String, pass: Int, window: Window) = TimedInput(flow, step, appearance, pass, window)

    /** Pixel sampling runs independently of Compose synchronization, including while performClick
     * waits. It gives an upper bound to the first changed rendered frame, not a presentation timestamp.
     * Bottom player/progress and system bars are excluded to avoid unrelated playback/clock ticks.
     */
    inner class TimedInput(private val flow: String, private val step: String, private val appearance: String, private val pass: Int, window: Window) : AutoCloseable {
        private val running = AtomicBoolean(true)
        private val area = AndroidRect()
        private val start: Long
        private var response: Double? = null
        private var busyAt: Double? = null
        private var settle = 0.0
        private var maxGap = 0.0
        private val worker: Thread
        init {
            instrumentation.runOnMainSync { window.decorView.getWindowVisibleDisplayFrame(area) }
            // Exclude persistent bottom bars; the response is the task content/keyboard/top controls.
            area.bottom = (area.bottom - 140 * density).toInt().coerceAtLeast(area.top + 1)
            val initial = fingerprint(area)
            start = SystemClock.elapsedRealtimeNanos()
            worker = Thread({
                var previous = start
                while (running.get()) {
                    val next = fingerprint(area)
                    val time = SystemClock.elapsedRealtimeNanos()
                    maxGap = max(maxGap, (time - previous) / 1e6)
                    previous = time
                    if (response == null && initial != null && next != null && next != initial) response = (time - start) / 1e6
                    Thread.sleep(16)
                }
            }, "FlowRun-pixels").apply { start() }
        }
        fun inputReturned(busy: Boolean) {
            if (busy && busyAt == null) busyAt = (SystemClock.elapsedRealtimeNanos() - start) / 1e6
        }
        fun settled() { settle = (SystemClock.elapsedRealtimeNanos() - start) / 1e6 }
        override fun close() {
            running.set(false)
            worker.join(5_000)
            check(!worker.isAlive) { "Pixel sampler did not finish" }
            if (settle == 0.0) settle = (SystemClock.elapsedRealtimeNanos() - start) / 1e6
            val sample = TimingRow(flow, step, appearance, pass, response, busyAt, settle, maxGap)
            samples += sample
            csv(timings, flow, step, appearance, pass, response, busyAt, settle, maxGap, "UiAutomation rendered pixel polling; upper bounds", response != null)
            timings.flush()
            check(!timings.checkError()) { "Failed writing timings.csv" }
        }
    }
    private fun fingerprint(area: AndroidRect): Long? {
        val bitmap = instrumentation.uiAutomation.takeScreenshot() ?: return null
        try {
            var hash = 1125899906842597L
            val left = area.left.coerceIn(0, bitmap.width - 1)
            val right = area.right.coerceIn(left + 1, bitmap.width)
            val top = area.top.coerceIn(0, bitmap.height - 1)
            val bottom = area.bottom.coerceIn(top + 1, bitmap.height)
            // Sample a grid dense enough to see a caret/character, without hashing every screen pixel.
            for (y in top until bottom step 4) for (x in left until right step 4) hash = hash * 31 + bitmap.getPixel(x, y)
            return hash
        } finally { bitmap.recycle() }
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
        if (data.isEmpty()) findings += "N/O FOOT-02 $appearance: Window FrameMetrics returned no samples."
        else if (late > 0) findings += "FOOT-02 $appearance C/long-list-fling: $late/${data.size} frames missed the platform deadline (refresh=$refresh Hz); frame rows in frames.csv."
    }
    fun failure(error: Throwable) { failed = error.stackTraceToString() }
    fun finish(success: Boolean) {
        measurements.close(); timings.close(); frames.close()
        File(directory, "summary.md").writeText(buildString {
            appendLine("# PodList Android flow run $runId")
            appendLine("Flows complete: $success. ${Build.MANUFACTURER} ${Build.MODEL}, Android ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT}), ${device.displayWidth}×${device.displayHeight} px, density=$density. Width is the emulator's current phone width; no CPU/network throttling. Delayed passes: 2000 ms per HTTP completion; timed passes: no added delay, five per appearance. Appearance changed using app Settings.")
            appendLine("\n## Measurement method and precision")
            appendLine("Semantics boundsInRoot and boundsInWindow are float physical px; dp = px / density. Deltas compare the same semantic handle with the immediately previous step in this flow/appearance. Android tolerance is 2 dp (also reports px). Input age uses monotonic uptime, 1 ms resolution; >500 ms is unprompted. All bounds/focus/typed/scroll values are one semantics snapshot before its PNG; screenshot follows and may be up to a frame or capture interval later. Scroll axes are Compose semantic units (LazyColumn index plus fractional offset); visible-first-item text is recorded because Lazy keys aren't public semantics. Input, heading, action, navigation, mini player and snackbar include explicit absent rows. Candidate actions are all labelled buttons. Multiple actions/headings are individually measured; no peer panels on this phone layout.")
            appendLine("Follow-up bounds are checked against the visible Window frame (IME/system insets) and measured navigation, player and snackbar rectangles, excluding the follow-up's own snackbar. Geometry uses a 2 px rounding allowance; PNGs remain evidence for scrims/custom overlays not exposed by semantics. Focus is the focused semantics label.")
            appendLine("Response: a background UiAutomation screenshot sampler compares rendered content pixels on a 4 px grid every 16 ms plus capture cost, excluding the bottom 140 dp and system bars. Monotonic nanosecond timestamps are reported as ms. The first changed capture is an UPPER BOUND on the first visible response; sampling gap is reported per input, not claimed as vsync precision. Compose mainClock autoAdvance=true; test synchronization may advance animations. Busy time is first observed indeterminate progress after input returns; blank means not observed (not proof of absence). Settle is after the explicit UI completion predicate and Compose waitForIdle, an upper bound, not server sync quiescence. Action dispatch/Compose synchronization overhead is included. Polling itself adds GPU/capture overhead; repeat on target hardware before treating borderline RESP-01 as definitive. No response observed is N/O, never a zero-ms success.")
            appendLine("FOOT-02 uses Android Window FrameMetrics TOTAL_DURATION and DEADLINE during eight touch flings of the verified 500-Episode page, with the display refresh rate. Frame duration precision is nanoseconds exposed by Android; dropped callback observations are separate from estimated missed vsyncs. No dependencies added.")
            appendLine("\n## Findings")
            if (findings.isEmpty()) appendLine("No measured stability/scroll violations in captured steps.")
            findings.distinct().forEach { appendLine("- $it") }
            appendLine("\n## RESP-01: nearest-rank 75th percentile, five runs per appearance")
            appendLine("| Appearance | Flow/step | n | Response upper ms | Busy observed p75 ms | Settle upper ms | Max sample gap ms | Verdict |")
            appendLine("|---|---|---:|---:|---:|---:|---:|---|")
            samples.groupBy { Triple(it.appearance, it.flow, it.step) }.forEach { (key, rows) ->
                val responses = rows.mapNotNull { it.response }
                val p75 = percentile(responses)
                val verdict = when {
                    rows.size < 5 || responses.size < 5 -> "N/O missing response samples"
                    p75!! > 200 -> "FAIL RESP-01 (upper bound; inspect sampling gap)"
                    else -> "pass ≤200 ms upper bound"
                }
                appendLine("| ${key.first} | ${key.second}/${key.third} | ${rows.size} | ${p75?.let(::fmt) ?: "N/O"} | ${percentile(rows.mapNotNull { it.busy })?.let(::fmt) ?: "unobserved"} | ${fmt(percentile(rows.map { it.settle })!!)} | ${fmt(rows.maxOf { it.gap })} | $verdict |")
                rows.filter { it.settle > 1_000 && (it.busy == null || it.busy > 1_000) }.forEach {
                    appendLine("\n- RESP-01 ${it.appearance} ${it.flow}/${it.step} run ${it.pass}: settles in ${fmt(it.settle)} ms, busy ${it.busy?.let(::fmt) ?: "not observed"} ms; needs 1 s busy review. timings.csv.")
                }
                rows.filter { it.settle > 10_000 }.forEach { appendLine("\n- RESP-01/CTRL-08 ${it.flow}/${it.step} run ${it.pass}: ${fmt(it.settle)} ms; manually check progress/estimate/cancel in capture.") }
            }
            appendLine("\n## Coverage notes")
            notes.distinct().forEach { appendLine("- $it") }
            appendLine("Stability sub-score: evidence supplied as per-step rows and PNG pairs; no rubric score is invented by this regression test. Guideline findings do not fail JUnit; missing flows, screenshots or required server/feed arguments do. Pixel timing cannot see a transient pressed frame between screenshots, distinguish caret blinking from acknowledgment, or time below the excluded bottom region; those require device trace/manual review.")
            failed?.let { appendLine("\n## Test failure\n```\n$it\n```") }
        })
    }
    private fun percentile(values: List<Double>): Double? = values.sorted().takeIf { it.isNotEmpty() }?.let { it[ceil(it.size * .75).toInt() - 1] }
    private fun fmt(value: Float) = String.format(Locale.US, "%.2f", value)
    private fun fmt(value: Double) = String.format(Locale.US, "%.2f", value)
    private fun csv(writer: PrintWriter, vararg values: Any?) = writer.println(values.joinToString(",") { "\"${it?.toString().orEmpty().replace("\"", "\"\"")}\"" })
}
