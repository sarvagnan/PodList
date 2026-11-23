#if os(macOS)
import AppKit
import CoreText
import PodListData
import PodListDomain
import Testing
@testable import PodListUI

@MainActor @Test func showNotesHaveReadableMeasureAt270Points() throws {
    let notes = """
        Each conversation starts with something familiar: a sack of rice, a shipping container, a sandwich or a queue outside a shop. From there we follow the decisions, habits and trade routes that connect one neighbourhood to the wider world. We hear from growers, shopkeepers, researchers and customers, leaving room for questions that do not have a simple answer.
        """
    let bodySize = NSFont.preferredFont(forTextStyle: .body, options: [:]).pointSize
    let font = NSFont.systemFont(ofSize: bodySize, weight: .regular, width: .condensed)
    let attributed = NSAttributedString(string: notes, attributes: [.font: font])
    let typesetter = CTTypesetterCreateWithAttributedString(attributed)
    let width = 270 - 2 * InspectorLayout.horizontalInset
    var index = 0
    var lengths: [Int] = []
    while index < attributed.length {
        let length = CTTypesetterSuggestLineBreak(typesetter, index, width)
        try #require(length > 0)
        index += length
        if index < attributed.length { lengths.append(length) }
    }
    let average = Double(lengths.reduce(0, +)) / Double(lengths.count)
    print("270 pt Inspector: \(String(format: "%.1f", average)) characters per complete line (\(font.pointSize) pt condensed body)")
    #expect(average >= 45)
}

@MainActor @Test func inspectorSelectionPreparationMicrobenchmark() {
    let clock = ContinuousClock()
    let description = String(repeating: "<p>A field recording &amp; a conversation about the price of rice.</p>", count: 180)
    let selected = "measured"
    let item = episode(selected)
    for entriesPerPlaylist in [15, 5_000] {
        var state = fixtureState()
        let otherEntries = (0..<entriesPerPlaylist).map { Entry(episodeId: "episode-\($0)", position: 0, positionAt: 0) }
        let matching = Entry(episodeId: selected, position: 23, positionAt: 0)
        state.playlists = (0..<8).map {
            Playlist(id: "playlist-\($0)", name: "Playlist \($0)", isDefault: $0 == 0, clearOnPlayed: false,
                     entries: otherEntries + [matching], cursor: nil, history: [], timeline: [])
        }
        let library = LibraryModel(snapshot: .init(state: state, subscriptions: [subscription()], episodes: [item]), deviceID: "this")
        let context = WindowContext(destination: .view("all"), selection: [selected])
        #expect(library.memberships(selected).count == 8)
        #expect(context.encoded != nil)
        #expect(Presentation.plainShowNotes(description).contains("recording & a conversation"))
        func report(_ operation: String, _ work: () -> Void) {
            var samples: [Double] = []
            for _ in 0..<31 {
                let duration = clock.measure(work).components
                samples.append(Double(duration.seconds) * 1_000 + Double(duration.attoseconds) / 1e15)
            }
            let p75 = samples.sorted()[23]
            print("Inspector benchmark, \(entriesPerPlaylist) entries per playlist, \(operation) p75: \(String(format: "%.3f", p75)) ms")
        }
        report("playlist memberships") { _ = library.memberships(selected) }
        report("scene context JSON") { _ = context.encoded }
        report("12 KB notes normalization") { _ = Presentation.plainShowNotes(description) }
    }
}
#endif
