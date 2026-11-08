package app.podlist.domain

import java.nio.file.Files
import java.nio.file.Path
import java.math.BigDecimal
import kotlinx.serialization.json.*
import org.junit.jupiter.api.DynamicTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestFactory
import kotlin.test.*

private val protocol = Path.of(System.getProperty("podlist.protocol"))
private fun document(path: Path) = ProtocolJson.parseToJsonElement(Files.readString(path))
private fun JsonElement.field(key: String) = jsonObject.getValue(key)
private inline fun <reified T> JsonElement.decode(): T = ProtocolJson.decodeFromJsonElement(this)

// JSON numbers compare by value, so Kotlin's 1.0 and a vector's 1 are the same number.
private fun canonical(value: JsonElement): Any? = when (value) {
    JsonNull -> null
    is JsonArray -> value.map(::canonical)
    is JsonObject -> value.mapValues { canonical(it.value) }
    is JsonPrimitive -> if (value.isString) value.content else value.booleanOrNull ?: BigDecimal(value.content).stripTrailingZeros()
}
private fun assertJson(expected: JsonElement, actual: JsonElement, context: String) =
    assertEquals(canonical(expected), canonical(actual), context)
private fun assertState(expected: JsonElement, actual: State, context: String) {
    assertJson(expected, ProtocolJson.encodeToJsonElement(actual), context)
    assertJson(expected, ProtocolJson.parseToJsonElement(State.decode(actual.encode()).encode()), "$context round-trip")
}

class ProtocolTest {
    @Test
    fun `every contract document has a runner`() {
        val rootFiles = Files.list(protocol).use { paths -> paths.filter { Files.isRegularFile(it) }.map { it.fileName.toString() }.toList().toSet() }
        assertEquals(setOf("operation.schema.json", "openapi.json", "views.json", "listening.json", "server.json"), rootFiles)
        val directories = Files.list(protocol).use { paths -> paths.filter { Files.isDirectory(it) }.map { it.fileName.toString() }.toList().toSet() }
        assertEquals(setOf("vectors"), directories)
        Files.walk(protocol.resolve("vectors")).use { paths ->
            assertTrue(paths.filter { Files.isRegularFile(it) }.allMatch { it.toString().endsWith(".json") }, "Unrecognized vector file")
        }
        assertEquals(4, document(protocol.resolve("views.json")).field("protocolVersion").jsonPrimitive.int)
        assertEquals(4, document(protocol.resolve("listening.json")).field("protocolVersion").jsonPrimitive.int)
        assertTrue(document(protocol.resolve("openapi.json")).field("openapi").jsonPrimitive.content.startsWith("3.1"))
    }

    private fun syncFiles(): List<Path> = Files.walk(protocol.resolve("vectors")).use { paths ->
        paths.filter { Files.isRegularFile(it) && it.toString().endsWith(".json") }.sorted().toList()
    }.also { assertTrue(it.isNotEmpty(), "No sync vectors discovered") }

    @TestFactory
    fun `sync vectors and every checkpoint`() = syncFiles().map { path -> DynamicTest.dynamicTest("sync: ${path.fileName}") {
        val vector = document(path)
        assertEquals(4, vector.field("protocolVersion").jsonPrimitive.int)
        val initial = vector.field("initial")
        var replayed = Replayed(initial.decode(), emptySet())
        assertState(initial, replayed.state, "initial")
        val operations = vector.field("operations").jsonArray.map { it.decode<Operation>() }
        val checkpoints = vector.jsonObject["checkpoints"]?.jsonArray
        if (checkpoints != null) assertEquals(operations.size, checkpoints.size)
        operations.forEachIndexed { index, operation ->
            assertJson(vector.field("operations").jsonArray[index], ProtocolJson.parseToJsonElement(operation.encode()), "operation $index round-trip")
            replayed = StateRules.replay(replayed.state, listOf(operation), replayed.applied)
            checkpoints?.let { assertState(it[index], replayed.state, "checkpoint $index") }
        }
        assertState(vector.field("expected"), replayed.state, "expected")
        val duplicate = StateRules.replay(replayed.state, operations, replayed.applied)
        assertState(vector.field("expected"), duplicate.state, "duplicate delivery across replay calls")
        assertEquals(replayed.applied, duplicate.applied)
        assertState(vector.field("expected"), StateRules.replay(initial.decode(), operations + operations).state, "batch replay with duplicate delivery")
    } }

    @Test
    fun `every schema Change has a Kotlin decoder and replay coverage`() {
        val schema = document(protocol.resolve("operation.schema.json"))
        val members = schema.field("\$defs").field("@podlist/domain/OperationEncoded").field("properties").field("change").field("anyOf").jsonArray
        val schemaTags = members.map { it.field("properties").field("_tag").field("enum").jsonArray.single().jsonPrimitive.content }.toSet()
        val variants = Change.serializer().descriptor.getElementDescriptor(1)
        val decoderTags = (0 until variants.elementsCount).map { variants.getElementDescriptor(it).serialName }.toSet()
        assertEquals(schemaTags, decoderTags, "Operation.Change schema and Kotlin sealed decoder must change together")
        val operations = syncFiles().flatMap { document(it).field("operations").jsonArray } +
            document(protocol.resolve("server.json")).jsonArray.flatMap { vector -> vector.field("batches").jsonArray.flatMap { it.field("expectedOperations").jsonArray } }
        val covered = operations.map { element ->
            val operation = element.decode<Operation>()
            val tag = element.field("change").field("_tag").jsonPrimitive.content
            assertEquals(tag, ProtocolJson.encodeToJsonElement(operation).field("change").field("_tag").jsonPrimitive.content)
            tag
        }.toSet()
        assertEquals(schemaTags, covered)
    }

    @TestFactory
    fun `server logs replay without client expansion`() = document(protocol.resolve("server.json")).jsonArray.map { vector ->
        DynamicTest.dynamicTest("server replay: ${vector.field("name").jsonPrimitive.content}") {
            var replayed = Replayed(vector.field("initial").decode<State>(), emptySet())
            for ((index, batch) in vector.field("batches").jsonArray.withIndex()) {
                // expectedOperations is the complete cumulative server log, including original intentions.
                val log = batch.field("expectedOperations").jsonArray.map { it.decode<Operation>() }
                replayed = StateRules.replay(replayed.state, log, replayed.applied)
                assertState(batch.field("expectedState"), replayed.state, "server batch $index")
            }
        }
    }

    @TestFactory
    fun `listening samples`() = document(protocol.resolve("listening.json")).field("samples").jsonArray.map { sample ->
        DynamicTest.dynamicTest("sample: ${sample.field("name").jsonPrimitive.content}") {
            fun point(value: JsonElement) = Listening.Sample(value.field("at").jsonPrimitive.double, value.field("position").jsonPrimitive.double)
            val before = sample.field("before").takeUnless { it == JsonNull }?.let(::point)
            val actual = Listening.sample(before, point(sample.field("after")), sample.field("speed").jsonPrimitive.double,
                sample.field("offsetMinutes").jsonPrimitive.int).map { ListeningAmount(it.day, sample.field("subscriptionId").jsonPrimitive.content, it.seconds) }
            assertJson(sample.field("expected"), ProtocolJson.encodeToJsonElement(actual), "sample")
        }
    }

    @TestFactory
    fun `Played thresholds`() = document(protocol.resolve("listening.json")).field("thresholds").jsonArray.map { threshold ->
        DynamicTest.dynamicTest("threshold: ${threshold.field("name").jsonPrimitive.content}") {
            fun nullable(key: String) = threshold.field(key).jsonPrimitive.doubleOrNull
            assertEquals(threshold.field("expected").jsonPrimitive.boolean,
                PlayedRules.isFinished(threshold.field("position").jsonPrimitive.double, nullable("duration"), nullable("threshold")))
        }
    }

    @TestFactory
    fun `listening sessions`() = document(protocol.resolve("listening.json")).field("sessions").jsonArray.map { vector ->
        DynamicTest.dynamicTest("session: ${vector.field("name").jsonPrimitive.content}") {
            val initial = vector.field("initial")
            val episodeId = initial.field("episodeId").jsonPrimitive.content
            val subscriptionId = initial.field("subscriptionId").jsonPrimitive.content
            val position = initial.field("position").jsonPrimitive.double
            val speed = initial.field("speed").jsonPrimitive.double
            val duration = initial.field("duration").jsonPrimitive.doubleOrNull
            val noon = 43_200_000L
            var state = State.initial()
            state = state.copy(playlists = listOf(state.playlists.single().copy(
                entries = listOf(Entry(episodeId, position, noon)), cursor = episodeId,
                clearOnPlayed = initial.field("clearOnPlayed").jsonPrimitive.boolean
            )), playbackSettings = state.playbackSettings.copy(speed = speed))
            val session = ListeningSession(DefaultPlaylistId, episodeId, subscriptionId, position, speed, duration,
                reportEveryMillis = 0, initialAt = noon)
            for ((index, step) in vector.field("steps").jsonArray.withIndex()) {
                val at = noon + step.field("at").jsonPrimitive.long
                val event = when (val action = step.field("action").jsonPrimitive.content) {
                    "play" -> ListeningSession.Event.Play
                    "pause" -> ListeningSession.Event.Pause
                    "position" -> ListeningSession.Event.Position(step.field("position").jsonPrimitive.double, step.field("duration").jsonPrimitive.doubleOrNull)
                    "seek" -> ListeningSession.Event.Seek(step.field("position").jsonPrimitive.double)
                    "speed" -> ListeningSession.Event.Speed(step.field("speed").jsonPrimitive.double)
                    "discontinuity" -> ListeningSession.Event.Discontinuity
                    "ended" -> ListeningSession.Event.Ended
                    "failure" -> ListeningSession.Event.Failure
                    else -> error("Unimplemented session action: $action")
                }
                for (change in session.accept(event, at, 0)) state = StateRules.apply(state, change, at)
                val seconds = state.listeningLog.orEmpty().values.sumOf { it.values.sum() }
                assertEquals(step.field("expectedSeconds").jsonPrimitive.double, seconds, "step $index")
            }
            assertEquals(vector.field("expectedPlayed").jsonPrimitive.boolean, state.episodeStates[episodeId]?.played != null)
            val actualPosition = state.playlists.single().entries.find { it.episodeId == episodeId }?.position
            assertEquals(vector.field("expectedEntryPosition").jsonPrimitive.doubleOrNull, actualPosition)
        }
    }
}
