#if os(macOS)
import SwiftUI

/// Centre an empty state when it fits; allow the complete message to scroll in short windows.
struct ScrollableEmptyState: SwiftUI.View {
    let title: LocalizedStringKey
    let systemImage: String
    let description: String

    init(_ title: LocalizedStringKey, systemImage: String, description: String) {
        self.title = title; self.systemImage = systemImage; self.description = description
    }

    var body: some SwiftUI.View {
        GeometryReader { geometry in
            ScrollView {
                ContentUnavailableView(title, systemImage: systemImage, description: Text(description))
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: geometry.size.height)
            }
            .scrollBounceBehavior(.basedOnSize)
        }
    }
}
#endif
