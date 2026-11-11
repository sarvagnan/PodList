import Foundation
import Testing
import PodListDomain
import struct PodListDomain.Operation
import PodListData
import ProtocolTestSupport

@Test func bundledOperationSchemaMatchesSharedSource() throws {
    #expect(try ProtocolValidation.schemaData == Data(contentsOf: Fixtures.protocolURL.appendingPathComponent("operation.schema.json")))
}

@Test(arguments: try Fixtures.vectorNames)
func everyRecordedVectorOperationMatchesSchema(_ name: String) async throws {
    let vector = try Fixtures.document(name)
    let db = try LocalDatabase(path: ":memory:")
    try await db.saveState(vector["initial"].decode())
    for operation in try vector["operations"].decode([Operation].self) {
        try ProtocolValidation.validate(operation)
        let recorded = try await db.record(operation.change, at: operation.recordedAt)
        try ProtocolValidation.validate(recorded)
    }
    for operation in try await db.outbox() { try ProtocolValidation.validate(operation) }
}

@Test func invalidDownloadRulesCannotRecordOperationsOrState() async throws {
    let db = try LocalDatabase(path: ":memory:")
    let initial = try await db.ensureState()
    for cap: Int64 in [0, -1, 9_007_199_254_740_992] {
        let rule = DownloadRule(subscriptionId: "s", deviceId: "d", mode: .allNew, keepAtMost: cap)
        await #expect(throws: ProtocolValidationFailure.self) { try await db.record(.setDownloadRule(rule: rule), at: 1) }
        var state = initial; state.downloadRules = [rule]
        await #expect(throws: ProtocolValidationFailure.self) { try await db.saveState(state) }
    }
    #expect(try await db.outbox().isEmpty)
    #expect(try await db.loadState() == initial)
    #expect(try await db.getMeta("sequence") == nil)
    for cap: Int64? in [nil, 1, 100] {
        try await db.record(.setDownloadRule(rule: .init(subscriptionId: "s", deviceId: "d", mode: .allNew, keepAtMost: cap)), at: 1)
    }
}

@Test func reopeningRepairsZeroCapAndPreservesLaterEdits() async throws {
    let path = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".sqlite")
    defer { try? FileManager.default.removeItem(at: path) }
    let db = try LocalDatabase(path: path.path)
    try await db.ensureState()
    let bad = Operation(id: "bad", deviceId: "d", sequence: 0, recordedAt: 1,
                        change: .setDownloadRule(rule: .init(subscriptionId: "s", deviceId: "d", mode: .allNew, keepAtMost: 0)))
    try await db.execute("INSERT INTO outbox(id, operation) VALUES (?, ?)", [.text(bad.id), .text(try ProtocolJSON.encode(bad))])
    try await db.execute("INSERT INTO download_rule(subscription_id, device_id, mode, keep_at_most) VALUES ('s', 'd', 'allNew', 0)")
    let reopened = try LocalDatabase(path: path.path)
    try await reopened.record(.setStar(episodeId: "e", starred: true), at: 2)
    let queued = try await reopened.outbox()
    #expect(queued.count == 2)
    #expect(queued.first?.id == "bad")
    for operation in queued { try ProtocolValidation.validate(operation) }
    #expect(try await reopened.loadState().downloadRules.first?.keepAtMost == nil)
    #expect(try await reopened.loadState().episodeStates["e"]?.starred == true)
    if case let .setDownloadRule(rule) = queued[0].change { #expect(rule.keepAtMost == nil); #expect(rule.mode == .allNew) }
    else { Issue.record("Rule intent lost") }
}
