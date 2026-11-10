package app.podlist

import kotlin.math.abs

/** Pure evidence policy, shared by instrumentation and the JVM evidence replay. */
internal object FlowRunClassification {
    enum class Phase { INPUT, WORKING, SETTLED }
    enum class Intent { NAVIGATE, EDIT, SCROLL, KEYBOARD, SUBMIT, CONTROL, NONE }
    data class Box(val x: Float, val y: Float)
    data class State(
        val row: Int, val flow: String, val appearance: String, val step: String, val png: String,
        val screen: String, val phase: Phase, val intent: Intent, val input: Long,
        val ageMs: Long?, val core: Map<String, Box>, val focus: String,
        val scroll: String, val typed: Map<String, String>, val pending: Boolean,
        val editedField: String? = null, val submittedFields: Set<String> = emptySet(),
        val labels: Map<String, String> = emptyMap(),
    )
    data class Result(val check: String, val verdict: String, val reason: String, val before: State, val after: State, val element: String = "") {
        fun evidence() = "measurements.csv rows ${before.row} → ${after.row}; [${before.png}](${before.png}) → [${after.png}](${after.png})"
        fun line(): String {
            val delta = if (check == "FLOW-01") before.core[element]?.let { a -> after.core[element]?.let { b -> "; Δleft=${b.x - a.x} dp, Δtop=${b.y - a.y} dp" } }.orEmpty()
                else if (check == "FLOW-02" && element == "focus") "; '${before.focus}' → '${after.focus}'"
                else if (check == "FLOW-02") "; '${before.scroll}' → '${after.scroll}'"
                else if (check == "FLOW-03") "; '${before.typed[element]}' → '${after.typed[element]}'" else ""
            return "$check $verdict ${after.appearance} ${after.flow}/${after.step} $element: $reason$delta; ${evidence()}."
        }
    }
    fun intent(step: String): Intent {
        val name = step.removeSuffix("-input").removeSuffix("-working").removeSuffix("-done")
        return when {
            name == "dismiss-keyboard" -> Intent.KEYBOARD
            name.startsWith("reveal-") || name == "return-podcast-header" || name == "long-list-fling" || name == "verify-reorder" -> Intent.SCROLL
            name.startsWith("type-") || name.startsWith("clear-") || name == "server-address" || name == "next-item" -> Intent.EDIT
            name in setOf("check-connect", "find", "submit-add", "create", "save", "create-view", "subscribe", "subscribe-submit") -> Intent.SUBMIT
            name.startsWith("start-") || name.startsWith("select-") || name.startsWith("open-") || name in setOf("connect", "default", "add", "add-podcasts", "search", "new-playlist", "settings", "appearance", "rename", "save-as-view", "collapse", "entry-menu") -> Intent.NAVIGATE
            else -> Intent.CONTROL
        }
    }
    fun phase(step: String) = when {
        step.endsWith("-input") -> Phase.INPUT
        step.endsWith("-working") -> Phase.WORKING
        else -> Phase.SETTLED
    }
    private val mainActions = setOf("Check and connect", "Find podcasts", "Subscribe", "Save", "Create Playlist", "Create View", "Save as a View", "Play Last", "Rename", "New Playlist", "Add podcasts")
    fun isCore(id: String, state: State): Boolean {
        if (id.startsWith("action:")) {
            val label = id.removePrefix("action:").substringBeforeLast(':')
            return label in mainActions || label == "Add to a Playlist" && "Show notes" in state.labels.values
        }
        return id.startsWith("input:") || id.startsWith("heading:") || id.startsWith("navigation:") || id == "bottom-navigation"
    }
    fun screen(headings: List<String>, fields: Set<String>): String =
        headings.firstOrNull().orEmpty() + headings.filter { it.startsWith("Now Playing ·") || it == "Add to a Playlist" }.joinToString(prefix = "|") +
            if ("Name" in fields) "|Name editor" else ""

    /** An intentional scroll, edit, focus or submit is not a late completion. Unknown
     * onset of an action's visual effect is N/O; capture age alone cannot prove onset. */
    fun classify(check: String, before: State, after: State, element: String = "", raw: Boolean = false): Result {
        fun result(verdict: String, why: String) = Result(check, verdict, why, before, after, element)
        val sameInput = before.input == after.input
        val completion = sameInput && before.pending && !after.pending && after.phase == Phase.SETTLED
        if (check == "FLOW-03") {
            if (!sameInput && after.intent == Intent.EDIT) return result("excluded", "person edited the field")
            if (after.typed[element] == null && (element in after.submittedFields || after.intent == Intent.SUBMIT && !sameInput))
                return result("excluded", "own submit succeeded; no newer unsubmitted edit")
            if (element in after.submittedFields) return result("excluded", "own submit succeeded; no newer unsubmitted edit")
            if (before.screen != after.screen && !sameInput) return result("excluded", "requested screen change")
            if (!completion) return result("N/O", "text changed without evidence of a late completion; capture is insufficient")
            if (before.typed[element].isNullOrBlank()) return result("excluded", "no input in progress")
            return result("fail", "late completion changed unsubmitted text '${before.typed[element]}' → '${after.typed[element]}'")
        }
        if (after.phase == Phase.INPUT) return result("excluded", "mid-transition input capture")
        if (before.screen != after.screen && !(check == "FLOW-02" && completion)) return result("excluded", "different screen/heading identity")
        if (check == "FLOW-01" && !isCore(element, after)) return result("excluded", "not a core element (main input/action, heading or navigation)")
        if (check == "FLOW-01" && element.startsWith("heading:") && before.labels[element] != after.labels[element])
            return result("excluded", "different heading element identity")
        if (before.screen.startsWith("|")) return result("N/O", "screen identity unavailable")
        if (before.phase == Phase.INPUT) return result("excluded", "mid-transition input baseline")
        if (raw && after.phase == Phase.WORKING) return result("excluded", "working capture is an async baseline, not settled destination")
        if (after.ageMs != null && after.ageMs <= 500) return result("excluded", "person input within 500 ms")
        if (!sameInput && after.intent in setOf(Intent.SCROLL, Intent.KEYBOARD)) return result("excluded", "person requested scroll/keyboard change")
        if (!sameInput && after.intent in setOf(Intent.NAVIGATE, Intent.EDIT)) return result("excluded", "person requested navigation or typing/focus change")
        if (check == "FLOW-02" && element == "scroll" && before.scroll.split(" | ").size != after.scroll.split(" | ").size)
            return result("excluded", "scroll container added/removed; not a scroll of the same view")
        if (check == "FLOW-02" && element == "focus" && before.focus in after.submittedFields)
            return result("excluded", "own submit may move focus to the next step")
        if (check == "FLOW-02" && !sameInput && after.intent in setOf(Intent.NAVIGATE, Intent.SUBMIT, Intent.EDIT))
            return result("excluded", "person requested navigation, focus or submit")
        if (sameInput && before.ageMs != null && before.ageMs <= 500)
            return result("N/O", "change interval overlaps the 500 ms person-input window")
        if (!sameInput && !completion) return result("N/O", "action effect onset unobserved; snapshot age is not change time")
        if (check == "FLOW-02" && element == "focus" && before.focus !in before.typed)
            return result("excluded", "focus was not in a field being typed in")
        return result("fail", if (check == "FLOW-01") "same-screen core edge moved >2 dp without input in the preceding 500 ms" else "unrequested $element change")
    }

    class Audit {
        private val states = mutableListOf<State>()
        fun probeEvidence(): String {
            val before = states.firstOrNull { it.step == "typing-pending" }
            val after = states.firstOrNull { it.step == "subscribe-completion" && it.appearance == before?.appearance }
            return if (before != null && after != null) Result("FLOW-03", "pass", "probe", before, after).evidence() else "measurements.csv: no complete pending probe"
        }
        val raw = mutableListOf<Result>()
        val comparisons = mutableListOf<Result>()
        private var previous: State? = null
        private var settled: State? = null
        private var working: State? = null
        fun add(now: State) {
            states += now
            fun compatible(s: State?) = s?.takeIf { it.flow == now.flow && it.appearance == now.appearance }
            val old = compatible(previous)
            if (old != null && (now.ageMs == null || now.ageMs > 500)) candidates(old, now, raw = true).forEach { (check, element) -> raw += classify(check, old, now, element, raw = true) }
            if (now.phase == Phase.SETTLED) {
                val bases = listOfNotNull(compatible(settled), compatible(working)?.takeIf { it.input == now.input && !now.pending }).distinctBy { it.row }
                bases.forEach { base -> candidates(base, now).forEach { (check, element) -> comparisons += classify(check, base, now, element) } }
                settled = now
                working = if (now.pending) now else null
            } else if (now.phase == Phase.WORKING && now.pending) working = now
            previous = now
        }
        private fun candidates(a: State, b: State, raw: Boolean = false): List<Pair<String, String>> = buildList {
            b.core.forEach { (id, box) -> a.core[id]?.let { old -> if ((raw || !id.startsWith("heading:") || a.labels[id] == b.labels[id]) && (abs(old.x - box.x) > 2 || abs(old.y - box.y) > 2)) add("FLOW-01" to id) } }
            if (a.focus.isNotBlank() && a.focus != b.focus) add("FLOW-02" to "focus")
            fun scroll(s: String) = if (raw) s else s.split(" | ").joinToString(" | ") { it.substringAfter(':') }
            if (scroll(a.scroll) != scroll(b.scroll)) add("FLOW-02" to "scroll")
            a.typed.filterValues { it.isNotBlank() }.forEach { (field, text) -> if (b.typed[field] != text) add("FLOW-03" to field) }
        }
        fun findings() = comparisons.filter { it.verdict == "fail" }.distinctBy { listOf(it.check, it.after.row, it.element) }
        fun summary(): String = buildString {
            appendLine("## Candidate audit")
            for (check in listOf("FLOW-01", "FLOW-02", "FLOW-03")) {
                val rows = raw.filter { it.check == check }
                appendLine("$check: ${rows.size} raw candidates. " + rows.groupingBy { "${it.verdict}: ${it.reason}" }.eachCount().entries.joinToString { "${it.key} = ${it.value}" })
            }
            appendLine("Raw candidates below retain their original adjacent-capture basis; only the settled/async comparisons decide the verdict. Excluded does not mean the whole check passes.")
            for (check in listOf("FLOW-01", "FLOW-02", "FLOW-03")) {
                appendLine("\n### $check raw candidates")
                raw.filter { it.check == check }.forEach { appendLine("- ${it.line()}") }
            }
            appendLine("\n## Settled and async findings")
            findings().forEach { appendLine("- ${it.line()}") }
            appendLine("\n## Unresolved comparisons")
            comparisons.filter { it.verdict == "N/O" }.forEach { appendLine("- ${it.line()}") }
        }
    }
    fun responseVerdict(upper: Double?, lower: Double?, count: Int): String = when {
        count < 5 || upper == null || lower == null -> "N/O: fewer than five resolved response intervals"
        upper <= 200 -> "pass"
        lower > 200 -> "fail"
        else -> "N/O: frame interval straddles 200 ms"
    }
    fun footVerdict(debuggable: Boolean, emulator: Boolean, frames: Int, late: Int): String = when {
        debuggable || emulator -> "N/O: ${if (debuggable) "debug build" else "non-debuggable build"} on ${if (emulator) "emulator" else "physical device"}; not audience hardware"
        frames == 0 -> "N/O: no frame samples"
        late > 0 -> "fail"
        else -> "pass"
    }
}
