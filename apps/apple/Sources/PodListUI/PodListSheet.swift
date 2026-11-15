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
            PodListSheetReadingSurface(title: title, width: width, content: content)
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

struct PodListSheetReadingSurface<Content: SwiftUI.View>: SwiftUI.View {
    let title: String
    let width: CGFloat
    @ViewBuilder let content: () -> Content
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title).macContentFont(.title2).bold().accessibilityAddTraits(.isHeader)
                .fixedSize(horizontal: false, vertical: true)
            content()
        }
        .labeledContentStyle(PodListSheetLabelStyle())
        .toggleStyle(PodListSheetCheckboxStyle())
        .frame(width: max(1, width - 48), alignment: .leading)
        .fixedSize(horizontal: false, vertical: true)
        .padding(24)
    }
}

/// Stacked labels leave the entire proposed width for fields and long values,
/// including at 200% text. Columns forms can exceed the sheet's proposal.
struct PodListSheetField<Content: SwiftUI.View>: SwiftUI.View {
    let title: String
    @ViewBuilder let content: () -> Content
    init(_ title: String, @ViewBuilder content: @escaping () -> Content) {
        self.title = title; self.content = content
    }
    var body: some SwiftUI.View {
        LabeledContent { content() } label: { Text(title) }
            .labeledContentStyle(PodListSheetLabelStyle())
    }
}

/// A Form inside the shared scrolling surface must not create another scroller
/// or negotiate an intrinsic columns width. Keep native controls and sections.
struct PodListSheetFormStyle: FormStyle {
    func makeBody(configuration: Configuration) -> some SwiftUI.View {
        VStack(alignment: .leading, spacing: 16) { configuration.content }
            .toggleStyle(PodListSheetCheckboxStyle())
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// The sheets' stacked label style also reaches toggles, which would put a
/// checkbox's title above a detached box. Draw the native checkbox with its
/// title trailing, as AppKit does; the title stays the control's only name.
struct PodListSheetCheckboxStyle: ToggleStyle {
    @Environment(\.isEnabled) private var isEnabled
    func makeBody(configuration: Configuration) -> some SwiftUI.View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Toggle(isOn: configuration.$isOn) { configuration.label }
                .toggleStyle(.checkbox).labelsHidden()
            configuration.label
                .foregroundStyle(isEnabled ? AnyShapeStyle(.primary) : AnyShapeStyle(.tertiary))
                .fixedSize(horizontal: false, vertical: true)
                .contentShape(Rectangle())
                .onTapGesture { if isEnabled { configuration.isOn.toggle() } }
                .accessibilityHidden(true)
        }
    }
}

private struct PodListSheetLabelStyle: LabeledContentStyle {
    func makeBody(configuration: Configuration) -> some SwiftUI.View {
        VStack(alignment: .leading, spacing: 6) {
            configuration.label.fixedSize(horizontal: false, vertical: true)
            configuration.content.frame(maxWidth: .infinity, alignment: .leading)
        }.frame(maxWidth: .infinity, alignment: .leading)
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
