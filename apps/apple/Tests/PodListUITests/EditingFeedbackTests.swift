#if os(macOS)
import SwiftUI
import Testing
import PodListData
@testable import PodListUI

@MainActor @Test func editFeedbackKeepsContentHeightAcrossEmptyStatusUndoRedoAndErrors() async throws {
    let db = try await fixtureDatabase()
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: UUID().uuidString,
                                     defaults: UserDefaults(suiteName: UUID().uuidString)!)
    func height() -> CGFloat {
        NSHostingView(rootView: VStack(spacing: 0) {
            LibraryFeedback(editor: editor)
            Color.clear.frame(height: 100)
        }.frame(width: 600)).fittingSize.height
    }
    #expect(height() == 132)
    _ = await editor.edits.edit([.setStar(episodeId: "a", starred: true)], name: "Star",
                               message: String(repeating: "Long feedback ", count: 50))
    #expect(height() == 132)
    await editor.undo()
    #expect(height() == 132)
    await editor.redo()
    #expect(height() == 132)
    editor.error = String(repeating: "An error ", count: 50)
    #expect(height() == 132)
}
#endif
