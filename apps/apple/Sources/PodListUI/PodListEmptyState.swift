#if os(macOS)
import SwiftUI

/// Native empty-state layout with readable text on both content and Inspector surfaces.
struct PodListEmptyState<Actions: SwiftUI.View>: SwiftUI.View {
    let title: LocalizedStringKey
    let systemImage: String
    let description: String?
    @ViewBuilder let actions: () -> Actions
    @Environment(\.libraryPlaybackBarInset) private var inset

    init(_ title: LocalizedStringKey, systemImage: String, description: String? = nil,
         @ViewBuilder actions: @escaping () -> Actions) {
        self.title = title; self.systemImage = systemImage; self.description = description; self.actions = actions
    }

    var body: some SwiftUI.View {
        if inset != nil {
            LibraryEmptyStateScroll { message }
        } else {
            message
        }
    }

    private var message: some SwiftUI.View {
        ContentUnavailableView {
            Label {
                Text(title).foregroundStyle(MacReadableSecondaryStyle())
            } icon: {
                Image(systemName: systemImage)
            }
        } description: {
            if let description { Text(description).foregroundStyle(MacReadableSecondaryStyle()) }
        } actions: {
            actions()
        }
    }
}

extension PodListEmptyState where Actions == EmptyView {
    init(_ title: LocalizedStringKey, systemImage: String, description: String? = nil) {
        self.init(title, systemImage: systemImage, description: description) { EmptyView() }
    }
}
#endif
