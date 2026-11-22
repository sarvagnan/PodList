#if os(macOS)
import AppKit
import Observation
import SwiftUI
import Testing
@testable import PodListUI

@MainActor @Observable
private final class ToolbarFocusFixtureModel {
    var scope = "Search this list"
    var request = false
    var acknowledgments = 0
}

@MainActor @Test func toolbarConsumesEachFocusRequestOnceAcrossScopeChanges() async {
    struct Fixture: View {
        @Bindable var model: ToolbarFocusFixtureModel
        var body: some View {
            LibraryToolbarSearch(text: .constant(""), focusRequested: Binding(
                get: { model.request },
                set: { model.request = $0; model.acknowledgments += 1 }
            ), scope: model.scope)
        }
    }

    let model = ToolbarFocusFixtureModel()
    let host = NSHostingView(rootView: Fixture(model: model))
    host.frame.size = CGSize(width: 200, height: 50)
    func settle() async {
        for _ in 0..<8 {
            host.layoutSubtreeIfNeeded()
            await Task.yield()
        }
    }
    await settle()
    #expect(model.acknowledgments == 0)
    model.request = true
    await settle()
    #expect(!model.request)
    #expect(model.acknowledgments == 1)

    model.scope = "Search Library"
    model.request = true
    await settle()
    #expect(!model.request)
    #expect(model.acknowledgments == 2)
    await settle()
    #expect(model.acknowledgments == 2)
}
#endif
