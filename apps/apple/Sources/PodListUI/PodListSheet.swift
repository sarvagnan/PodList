#if os(macOS)
import SwiftUI

/// Every task sheet has one reading surface and one pinned control surface.
/// Keep feedback outside glass, and let only the content scroll at small sizes.
struct PodListSheet<Content: SwiftUI.View, Status: SwiftUI.View, Secondary: SwiftUI.View>: SwiftUI.View {
    let title: String
    let width: CGFloat
    let actionTitle: String
    var actionEnabled = true
    var defaultShortcut = true
    var cancelTitle: String? = "Cancel"
    var cancelEnabled = true
    let cancel: () -> Void
    let action: () -> Void
    let content: () -> Content
    let status: () -> Status
    let secondary: () -> Secondary

    init(title: String, width: CGFloat, actionTitle: String, actionEnabled: Bool = true,
         defaultShortcut: Bool = true, cancelTitle: String? = "Cancel", cancelEnabled: Bool = true,
         cancel: @escaping () -> Void, action: @escaping () -> Void,
         @ViewBuilder content: @escaping () -> Content,
         @ViewBuilder status: @escaping () -> Status = { EmptyView() },
         @ViewBuilder secondary: @escaping () -> Secondary = { EmptyView() }) {
        self.title = title; self.width = width; self.actionTitle = actionTitle
        self.actionEnabled = actionEnabled; self.defaultShortcut = defaultShortcut
        self.cancelTitle = cancelTitle; self.cancelEnabled = cancelEnabled
        self.cancel = cancel; self.action = action; self.content = content
        self.status = status; self.secondary = secondary
    }

    var body: some SwiftUI.View {
        ContentSizedPanel(width: width) {
            VStack(alignment: .leading, spacing: 16) {
                Text(title).macContentFont(.title2).bold().accessibilityAddTraits(.isHeader)
                content()
            }.padding(24)
        } footer: {
            VStack(spacing: 0) {
                status().padding(.horizontal, 24)
                PodListSheetFooter(actionTitle: actionTitle, actionEnabled: actionEnabled,
                                   defaultShortcut: defaultShortcut, cancelTitle: cancelTitle,
                                   cancelEnabled: cancelEnabled, cancel: cancel, action: action,
                                   secondary: secondary)
            }
        }
    }
}

/// Shared with the modeless Now Playing window's closing controls.
struct PodListSheetFooter<Secondary: SwiftUI.View>: SwiftUI.View {
    let actionTitle: String
    var actionEnabled = true
    var defaultShortcut = true
    var cancelTitle: String? = "Cancel"
    var cancelEnabled = true
    let cancel: () -> Void
    let action: () -> Void
    let secondary: () -> Secondary

    init(actionTitle: String, actionEnabled: Bool = true, defaultShortcut: Bool = true,
         cancelTitle: String? = "Cancel", cancelEnabled: Bool = true,
         cancel: @escaping () -> Void, action: @escaping () -> Void,
         @ViewBuilder secondary: @escaping () -> Secondary = { EmptyView() }) {
        self.actionTitle = actionTitle; self.actionEnabled = actionEnabled
        self.defaultShortcut = defaultShortcut; self.cancelTitle = cancelTitle
        self.cancelEnabled = cancelEnabled; self.cancel = cancel; self.action = action
        self.secondary = secondary
    }

    var body: some SwiftUI.View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 12) {
                secondary().fixedSize()
                Spacer(minLength: 16)
                primaryActions.fixedSize()
            }
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 12) { secondary() }
                HStack { Spacer(minLength: 0); primaryActions }
            }
        }
        .padding(20).macGlassSurface().padding([.horizontal, .bottom], 12)
    }
    private var primaryActions: some SwiftUI.View {
        HStack(spacing: 12) {
            if let cancelTitle {
                Button(cancelTitle, action: cancel).keyboardShortcut(.cancelAction).disabled(!cancelEnabled)
            }
            Button(actionTitle, action: action)
                .keyboardShortcut(defaultShortcut ? .defaultAction : (cancelTitle == nil ? .cancelAction : nil))
                .buttonStyle(MacDefaultButtonStyle()).disabled(!actionEnabled)
        }
    }
}
#endif
