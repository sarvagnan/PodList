import Foundation
import Testing
import PodListDomain
import struct PodListDomain.Operation
import ProtocolTestSupport

private func assertState(_ expected: JSON, _ state: State, context: String) throws {
    #expect(try JSON.encoded(state) == expected, Comment(rawValue: context))
    #expect(try JSON.encoded(JSON.encoded(state).decode(State.self)) == expected, Comment(rawValue: context + " round-trip"))
}

@Test(arguments: try Fixtures.vectorNames)
func syncVector(_ name: String) throws {
    let vector = try Fixtures.document(name)
    #expect(vector["protocolVersion"].int == 4)
    let initial = try vector["initial"].decode(State.self)
    var replayed = Replayed(state: initial)
    try assertState(vector["initial"], initial, context: "initial")
    let operations = try vector["operations"].decode([Operation].self)
    let checkpoints = vector.object["checkpoints"]?.array
    if let checkpoints { #expect(checkpoints.count == operations.count) }
    for (index, operation) in operations.enumerated() {
        #expect(try JSON.encoded(operation) == vector["operations"].array[index])
        replayed = StateRules.replay(replayed.state, operations: [operation], applied: replayed.applied)
        if let checkpoints { try assertState(checkpoints[index], replayed.state, context: "\(name) checkpoint \(index)") }
    }
    try assertState(vector["expected"], replayed.state, context: "expected")
    let duplicate = StateRules.replay(replayed.state, operations: operations, applied: replayed.applied)
    try assertState(vector["expected"], duplicate.state, context: "duplicate delivery between calls")
    #expect(duplicate.applied == replayed.applied)
    try assertState(vector["expected"], StateRules.replay(initial, operations: operations + operations).state, context: "batch duplicates")
}

@Test(arguments: try Fixtures.document("server.json").array)
func serverLog(_ vector: JSON) throws {
    var replayed = Replayed(state: try vector["initial"].decode())
    for batch in vector["batches"].array {
        let log = try batch["expectedOperations"].decode([Operation].self)
        replayed = StateRules.replay(replayed.state, operations: log, applied: replayed.applied)
        try assertState(batch["expectedState"], replayed.state, context: vector["name"].string)
    }
}

@Test func contractCoverage() throws {
    let names = Set(try FileManager.default.contentsOfDirectory(atPath: Fixtures.protocolURL.path))
    #expect(names == ["operation.schema.json", "openapi.json", "devices.json", "views.json", "listening.json", "server.json", "feeds.json", "vectors"])
    let vectors = try FileManager.default.contentsOfDirectory(atPath: Fixtures.protocolURL.appendingPathComponent("vectors").path)
    #expect(!vectors.isEmpty)
    #expect(vectors.allSatisfy { $0.hasSuffix(".json") })
    for document in ["views.json", "listening.json", "feeds.json"] { #expect(try Fixtures.document(document)["protocolVersion"].int == 4) }
    #expect(try Fixtures.document("openapi.json")["openapi"].string.hasPrefix("3.1"))
    let members = try Fixtures.document("operation.schema.json")["$defs"]["@podlist/domain/OperationEncoded"]["properties"]["change"]["anyOf"].array
    let tags = Set(members.map { $0["properties"]["_tag"]["enum"].array[0].string })
    var operations = try Fixtures.vectorNames.flatMap { try Fixtures.document($0)["operations"].array }
    operations += try Fixtures.document("server.json").array.flatMap { $0["batches"].array.flatMap { $0["expectedOperations"].array } }
    let covered = try Set(operations.map { element in
        let operation = try element.decode(Operation.self)
        #expect(try JSON.encoded(operation) == element)
        try ProtocolValidation.validate(operation)
        return element["change"]["_tag"].string
    })
    #expect(tags == covered)
    #expect(throws: (any Error).self) { try JSON.object(["_tag": .string("Unknown")]).decode(Change.self) }
}

@Test(arguments: try Fixtures.document("listening.json")["samples"].array)
func listeningSample(_ sample: JSON) throws {
    func point(_ value: JSON) -> Listening.Sample { .init(at: value["at"].double, position: value["position"].double) }
    let before = sample["before"] == .null ? nil : point(sample["before"])
    let measured = Listening.sample(before: before, after: point(sample["after"]), speed: sample["speed"].double,
                                    offsetMinutes: Int(sample["offsetMinutes"].int))
    let actual = measured.map { ListeningAmount(day: $0.day, subscriptionId: sample["subscriptionId"].string, seconds: $0.seconds) }
    #expect(try JSON.encoded(actual) == sample["expected"])
}

@Test(arguments: try Fixtures.document("listening.json")["thresholds"].array)
func playedThreshold(_ threshold: JSON) {
    #expect(PlayedRules.isFinished(position: threshold["position"].double, duration: threshold["duration"].nullableDouble,
                                  threshold: threshold["threshold"].nullableDouble) == threshold["expected"].bool)
}

@Test(arguments: try Fixtures.document("listening.json")["sessions"].array)
func listeningSession(_ vector: JSON) throws {
    let initial = vector["initial"]
    let episodeId = initial["episodeId"].string
    let noon: Int64 = 43_200_000
    var state = State.initial()
    state.playlists[0].entries = [Entry(episodeId: episodeId, position: initial["position"].double, positionAt: noon)]
    state.playlists[0].cursor = episodeId
    state.playlists[0].clearOnPlayed = initial["clearOnPlayed"].bool
    state.playbackSettings.speed = initial["speed"].double
    var session = ListeningSession(playlistId: defaultPlaylistId, episodeId: episodeId, subscriptionId: initial["subscriptionId"].string,
                                   initialPosition: initial["position"].double, initialSpeed: initial["speed"].double,
                                   initialDuration: initial["duration"].nullableDouble, reportEveryMillis: 0, initialAt: noon)
    for step in vector["steps"].array {
        let event: ListeningSession.Event = switch step["action"].string {
        case "play": .play
        case "pause": .pause
        case "position": .position(seconds: step["position"].double, duration: step["duration"].nullableDouble)
        case "seek": .seek(seconds: step["position"].double)
        case "speed": .speed(step["speed"].double)
        case "discontinuity": .discontinuity
        case "ended": .ended
        case "failure": .failure
        default: fatalError("Unimplemented session action")
        }
        let at = noon + step["at"].int
        for change in session.accept(event, at: at, offsetMinutes: 0) { state = StateRules.apply(state, change: change, at: at) }
        let seconds = (state.listeningLog ?? [:]).values.flatMap(\.values).reduce(0, +)
        #expect(seconds == step["expectedSeconds"].double)
    }
    #expect((state.episodeStates[episodeId]?.played != nil) == vector["expectedPlayed"].bool)
    #expect(state.playlists[0].entries.first { $0.episodeId == episodeId }?.position == vector["expectedEntryPosition"].nullableDouble)
}

@Test(arguments: try Fixtures.document("views.json")["cases"].array)
func memoryView(_ example: JSON) throws {
    let fixture = try Fixtures.document("views.json")
    let query = example["view"]
    let view = try View(id: "v", name: "Test", filter: query["filter"].decode(), sort: query["sort"].decode(), limit: query["limit"].decode())
    let episodes = try (example.object["episodes"] ?? fixture["episodes"]).decode([Episode].self)
    let actual = try ViewRules.evaluate(view, subscriptions: fixture["subscriptions"].decode(), episodes: episodes,
                                        state: fixture["state"].decode(), now: (example.object["now"] ?? fixture["now"]).int)
    #expect(actual.map(\.id) == (try example["expected"].decode([String].self)))
}

@Test(arguments: try Fixtures.document("devices.json")["devices"].array)
func deviceRegistration(_ vector: JSON) throws {
    let device = try vector.decode(Device.self)
    #expect(try JSON.encoded(device) == vector)
}
