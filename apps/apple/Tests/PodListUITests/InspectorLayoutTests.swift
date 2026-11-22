#if os(macOS)
import AppKit
import CoreText
import Testing
@testable import PodListUI

@MainActor @Test func showNotesHaveReadableMeasureAt270Points() throws {
    let notes = """
        Each conversation starts with something familiar: a sack of rice, a shipping container, a sandwich or a queue outside a shop. From there we follow the decisions, habits and trade routes that connect one neighbourhood to the wider world. We hear from growers, shopkeepers, researchers and customers, leaving room for questions that do not have a simple answer.
        """
    let font = NSFont.preferredFont(forTextStyle: .footnote, options: [:])
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
    print("270 pt Inspector: \(String(format: "%.1f", average)) characters per complete line (\(font.pointSize) pt footnote)")
    #expect(average >= 45)
}
#endif
