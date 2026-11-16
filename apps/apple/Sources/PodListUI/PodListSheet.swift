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

/// Bound label and control columns to the proposed sheet width, including at 200% text.
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

/// Keep checkbox titles trailing instead of putting them in the form label
/// column. Draw the native checkbox with its
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
    @Environment(\.macTextScale) private var textScale
    func makeBody(configuration: Configuration) -> some SwiftUI.View {
        PodListSheetFieldLayout(labelWidth: 160 * textScale) {
            configuration.label.multilineTextAlignment(.trailing)
                .fixedSize(horizontal: false, vertical: true)
            configuration.content.frame(maxWidth: .infinity, alignment: .leading)
                .fixedSize(horizontal: false, vertical: true)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Unlike Form's intrinsic column sizing, every row respects the sheet proposal.
/// A control that cannot fit beside its label gets the full width below it.
struct PodListSheetFieldLayout: Layout {
    let labelWidth: CGFloat
    private let spacing: CGFloat = 12
    private func metrics(_ proposal: ProposedViewSize, _ subviews: Subviews) -> (width: CGFloat, label: CGFloat, stacked: Bool, height: CGFloat) {
        let width = proposal.width ?? 504
        let label = min(labelWidth, width * 0.4)
        let control = max(1, width - label - spacing)
        let measured = subviews[1].sizeThatFits(ProposedViewSize(width: control, height: nil))
        let stacked = measured.width > control + 0.5
        let labelSize = subviews[0].sizeThatFits(ProposedViewSize(width: stacked ? width : label, height: nil))
        let controlSize = subviews[1].sizeThatFits(ProposedViewSize(width: stacked ? width : control, height: nil))
        return (width, label, stacked, stacked ? labelSize.height + 6 + controlSize.height : max(labelSize.height, controlSize.height))
    }
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let row = metrics(proposal, subviews)
        return CGSize(width: row.width, height: row.height)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let row = metrics(ProposedViewSize(width: bounds.width, height: nil), subviews)
        let labelProposal = ProposedViewSize(width: row.stacked ? bounds.width : row.label, height: nil)
        let labelHeight = subviews[0].sizeThatFits(labelProposal).height
        subviews[0].place(at: CGPoint(x: row.stacked ? bounds.minX : bounds.minX + row.label,
                                     y: bounds.minY), anchor: row.stacked ? .topLeading : .topTrailing, proposal: labelProposal)
        subviews[1].place(at: CGPoint(x: row.stacked ? bounds.minX : bounds.minX + row.label + spacing,
                                     y: bounds.minY + (row.stacked ? labelHeight + 6 : 0)), anchor: .topLeading,
                          proposal: ProposedViewSize(width: row.stacked ? bounds.width : bounds.width - row.label - spacing, height: nil))
    }
}

struct PodListSheetSectionHeading: SwiftUI.View {
    let title: String
    init(_ title: String) { self.title = title }
    var body: some SwiftUI.View {
        Text(title).macContentFont(.headline).accessibilityAddTraits(.isHeader)
            .fixedSize(horizontal: false, vertical: true)
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
                secondary().buttonStyle(.bordered).tint(nil).fixedSize()
                Spacer(minLength: 16)
                primaryActions.fixedSize()
            }
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 12) { secondary().buttonStyle(.bordered).tint(nil) }
                HStack { Spacer(minLength: 0); primaryActions }
            }
        }
        .padding(20).macGlassSurface().padding([.horizontal, .bottom], 12)
    }
    private var primaryActions: some SwiftUI.View {
        HStack(spacing: 12) {
            if let cancelTitle {
                Button(cancelTitle, action: cancel).buttonStyle(.bordered).tint(nil).keyboardShortcut(.cancelAction).disabled(!cancelEnabled)
            }
            Button(actionTitle, action: action)
                .keyboardShortcut(defaultShortcut ? .defaultAction : (cancelTitle == nil ? .cancelAction : nil))
                .buttonStyle(MacDefaultButtonStyle()).disabled(!actionEnabled)
        }
    }
}
extension SwiftUI.View {
    /// Esc closes a window that has no footer button to carry the Cancel shortcut.
    /// onExitCommand alone needs a focused control inside the window.
    func closesOnEscape(_ close: @escaping () -> Void) -> some SwiftUI.View {
        onExitCommand(perform: close)
            .background {
                Button("Close", action: close).keyboardShortcut(.cancelAction)
                    .opacity(0).frame(width: 0, height: 0).accessibilityHidden(true).focusable(false)
            }
    }
}
#endif
