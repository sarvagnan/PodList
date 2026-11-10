package app.podlist

import java.io.File

/** Offline replay. Old strips lack dispatch/async metadata: infer only the scripted
 * inputs and the explicitly held Subscribe probe; unknown onset stays N/O. */
internal fun readFlowStates(file: File): List<FlowRunClassification.State> {
    val records = readFlowCsv(file)
    var serial = 0L
    var intent = FlowRunClassification.Intent.NONE
    var edited: String? = null
    var submitted = emptySet<String>()
    var lastTyped = emptyMap<String, String>()
    return records.groupBy { it.getValue("row") }.values.map { rows ->
        val row = rows.first()
        val step = row.getValue("step")
        val typed = row.getValue("typed_values").split(" | ").filter { '=' in it }.associate { it.substringBefore('=') to it.substringAfter('=') }
        if (step.endsWith("-input") || step == "long-list-fling" || step.startsWith("reveal-")) {
            serial++
            intent = FlowRunClassification.intent(step)
            edited = if (intent == FlowRunClassification.Intent.EDIT) typed.keys.firstOrNull { typed[it] != lastTyped[it] } else null
            if (edited != null) submitted = submitted - edited
            if (intent == FlowRunClassification.Intent.SUBMIT) submitted = lastTyped.keys
        }
        val fields = rows.filter { it["element"]!!.startsWith("input:") && it["present"] == "true" }.map { it.getValue("label") }.toSet()
        val headings = rows.filter { it["element"]!!.startsWith("heading:") && it["present"] == "true" }.map { it.getValue("label") }
        val pending = step in setOf("subscribe-submit-input", "subscribe-submit-working", "subscribe-submit-done", "subscribe-working", "type-while-pending-input", "type-while-pending-working", "type-while-pending-done", "typing-pending")
        lastTyped = typed
        FlowRunClassification.State(row.getValue("row").toInt(), row.getValue("flow"), row.getValue("appearance"), step, row.getValue("screenshot"),
            row["screen_identity"] ?: FlowRunClassification.screen(headings, fields), FlowRunClassification.phase(step),
            row["intent"]?.let { FlowRunClassification.Intent.valueOf(it) } ?: intent,
            row["input_serial"]?.toLong() ?: serial, row["input_age_ms"]?.toLongOrNull(),
            rows.filter { it["present"] == "true" }.associate { it.getValue("element") to FlowRunClassification.Box(it.getValue("x_dp").toFloat(), it.getValue("y_dp").toFloat()) },
            row.getValue("focus"), row.getValue("scroll_axes").split(" | ").joinToString(" | ") { it.substringBefore('/') }, typed,
            row["async_pending"]?.toBoolean() ?: pending, edited, submitted, rows.associate { it.getValue("element") to it.getValue("label") })
    }
}

internal fun readFlowCsv(file: File): List<Map<String, String>> {
    val records = mutableListOf<List<String>>()
    val record = mutableListOf<String>()
    val field = StringBuilder()
    val text = file.readText()
    var quoted = false
    var i = 0
    while (i < text.length) {
        val c = text[i++]
        when {
            c == '"' && quoted && i < text.length && text[i] == '"' -> { field.append('"'); i++ }
            c == '"' -> quoted = !quoted
            !quoted && (c == ',' || c == '\n') -> {
                record += field.toString(); field.clear()
                if (c == '\n') { records += record.toList(); record.clear() }
            }
            c != '\r' -> field.append(c)
        }
    }
    if (field.isNotEmpty() || record.isNotEmpty()) { record += field.toString(); records += record.toList() }
    return records.drop(1).map { records.first().zip(it).toMap() }
}

fun main(args: Array<String>) {
    require(args.size == 1) { "Use :domain:reclassifyFlowRun -PflowEvidence=/path/to/run" }
    val directory = File(args[0])
    val audit = FlowRunClassification.Audit()
    val states = readFlowStates(File(directory, "measurements.csv"))
    states.forEach(audit::add)
    val original = File(directory, "summary-original.md")
    if (!original.exists()) File(directory, "summary.md").copyTo(original)
    val old = original.readText()
    val output = File(directory, "summary.md")
    output.writeText(buildString {
        appendLine("# PodList Android evidence reclassification")
        appendLine("Source run ${directory.name}: debug build, Google sdk_gphone64_arm64 emulator on Mac host, Android 16 SDK 36, 1344×2992 px, density 3.0. Not audience hardware. Five undelayed timed passes per appearance; stability HTTP delay 2000 ms. Raw CSVs and PNGs unchanged; prior verdicts retained in summary-original.md as superseded evidence.")
        appendLine("\n## Verdicts\n\n| Check | Verdict/counts | Key evidence |\n|---|---|---|")
        for (check in listOf("FLOW-01", "FLOW-02", "FLOW-03")) {
            val failures = audit.findings().filter { it.check == check }
            val unknown = audit.comparisons.filter { it.check == check && it.verdict == "N/O" }
            appendLine("| $check | ${if (failures.isNotEmpty()) "fail" else if (unknown.isNotEmpty()) "N/O" else "pass"}; ${failures.size} findings, ${unknown.size} unresolved; ${audit.raw.count { it.check == check }} original candidates | ${(failures.firstOrNull() ?: unknown.firstOrNull())?.evidence() ?: "measurements.csv rows 95→96 and 266→267 (typed probe preserved)"} |")
        }
        val visibility = old.lines().filter { it.startsWith("- FLOW-04") }
        appendLine("| FLOW-04 | ${if (visibility.isEmpty()) "pass" else "fail"}; ${visibility.size} raw visibility findings retained | measurements.csv follow_up_visible; see findings |")
        appendLine("| FLOW-05 | N/O; no peer panels measured | phone strip |")
        appendLine("| FLOW-06 | N/O; not measured | phone strip |")
        appendLine("| FLOW-07 | N/O; not measured | phone strip |")
        val timings = readFlowCsv(File(directory, "timings.csv"))
        appendLine("| RESP-01 | N/O; ${timings.size} inputs; screenshot gaps cannot resolve 200 ms; debug/emulator | timings.csv row 2 |")
        appendLine("| FOOT-02 | N/O; debug build on emulator; not audience hardware; raw 21/21 late frames in each appearance | frames.csv row 2 |")
        appendLine("\n## Findings")
        appendLine(audit.summary())
        visibility.forEach { line ->
            val rowNumber = Regex("row (\\d+)").find(line)?.groupValues?.get(1)?.toInt()
            val index = states.indexOfFirst { it.row == rowNumber }
            val state = states.getOrNull(index)
            val before = states.getOrNull(index - 1) ?: state
            appendLine("$line PNG pair [${before?.png}](${before?.png}) → [${state?.png}](${state?.png}).")
        }
        appendLine("\n## RESP-01: nearest-rank p75 of original screenshot upper bounds")
        appendLine("These raw times remain diagnostic upper bounds; every group is N/O because the screenshot intervals cannot resolve 200 ms and the build/device are not representative. Busy observation time does not prove absence before 1 s.")
        appendLine("\n| Appearance | Flow/step | n | Response upper p75 ms | Busy observed p75 ms | Settle upper p75 ms | Max gap ms | Verdict / timing rows |")
        appendLine("|---|---|---:|---:|---:|---:|---:|---|")
        fun p75(rows: List<Map<String, String>>, column: String): String {
            val values = rows.mapNotNull { it[column]?.toDoubleOrNull() }.sorted()
            return if (values.isEmpty()) "unobserved" else String.format(java.util.Locale.US, "%.2f", values[kotlin.math.ceil(values.size * .75).toInt() - 1])
        }
        timings.withIndex().groupBy { listOf(it.value["appearance"], it.value["flow"], it.value["step"]) }.forEach { (key, indexed) ->
            val rows = indexed.map { it.value }
            val gap = rows.mapNotNull { it["pixel_sample_gap_max_ms"]?.toDoubleOrNull() }.maxOrNull()
            appendLine("| ${key[0]} | ${key[1]}/${key[2]} | ${rows.size} | ${p75(rows, "first_response_upper_ms")} | ${p75(rows, "busy_first_observed_ms")} | ${p75(rows, "settle_upper_ms")} | $gap | N/O; timings.csv rows ${indexed.joinToString { (it.index + 2).toString() }} |")
        }
        appendLine("\n## Method")
        appendLine("Same pure Kotlin classifier as instrumentation. Settled states compare to previous settled state in the same flow/appearance; the explicit delayed Subscribe completion also compares to pending typed input. FLOW-01 ignores input captures, different headings/screens, non-core blocks, requested scroll/keyboard changes and ≤500 ms input; 2 dp top/left tolerance. FLOW-02 ignores requested navigation/focus/submit/scroll and normalizes scroll node IDs for settled comparisons. FLOW-03 ignores deliberate edits and own-submit cleanup, protecting unsubmitted text during a pending completion. All 17 original text candidates are listed individually above with row/PNG pairs. Old strips lack dispatch/onset/async metadata: only scripted input intents and the explicitly held Subscribe probe can be recovered. Unresolved same-screen action effects are N/O, never automatically failed from capture age. Raw-candidate classifications are audit dispositions; settled/async comparisons determine verdicts and may add genuine findings.")
        appendLine("RESP-01 old screenshot times remain raw upper bounds; late samples are not failures. New runs use OnDrawListener timestamps plus asynchronous PixelCopy confirmation, with conservative frame intervals and N/O where skipped draws/uncertainty prevent resolving 200 ms. FOOT-02 raw durations/deadlines and callback drops are retained; debug/emulator verdict is N/O. Re-run on non-debuggable physical audience hardware for performance grading. Follow-up geometry findings are retained for PNG review. No device run was performed during reclassification.")
    })
    println("Wrote ${output.absolutePath}")
    for (check in listOf("FLOW-01", "FLOW-02", "FLOW-03")) {
        val raw = audit.raw.filter { it.check == check }
        println("$check raw=${raw.size}: " + raw.groupingBy { "${it.verdict}: ${it.reason}" }.eachCount())
        println("$check settled failures=${audit.findings().count { it.check == check }} unresolved=${audit.comparisons.count { it.check == check && it.verdict == "N/O" }}")
    }
}
