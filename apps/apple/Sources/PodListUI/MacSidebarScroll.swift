#if os(macOS)
import SwiftUI

/// List keeps native sidebar rows and selection. Save the first readable row
/// independently of the selection, then use the List's scroll proxy on restore.
@MainActor final class MacSidebarScroll {
    private var viewport = CGRect.zero
    private var rows: [SidebarScrollRow: CGRect] = [:]
    private var pending: Task<Void, Never>?

    func measureViewport(_ frame: CGRect, update: @escaping (SidebarScrollRow) -> Void) {
        viewport = frame
        record(update)
    }

    func measureRow(_ id: SidebarScrollRow, frame: CGRect?, update: @escaping (SidebarScrollRow) -> Void) {
        rows[id] = frame
        record(update)
    }

    private func record(_ update: @escaping (SidebarScrollRow) -> Void) {
        // A scroll lays out several hosted rows. Use the frames together.
        guard pending == nil else { return }
        pending = Task { [weak self] in
            guard let self else { return }
            self.pending = nil
            let top = rows.filter {
                $0.value.height > 0 && viewport.intersection($0.value).height >= $0.value.height / 2
            }.min { $0.value.minY < $1.value.minY }
            if let top { update(top.key) }
        }
    }
}

extension SwiftUI.View {
    func trackSidebarRow(_ id: SidebarScrollRow, using tracker: MacSidebarScroll,
                         update: @escaping (SidebarScrollRow) -> Void) -> some SwiftUI.View {
        self.id(id)
            .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: {
                tracker.measureRow(id, frame: $0, update: update)
            }
            .onDisappear { tracker.measureRow(id, frame: nil, update: update) }
    }
}
#endif
