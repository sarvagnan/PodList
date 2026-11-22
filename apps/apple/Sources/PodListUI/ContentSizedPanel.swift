#if os(macOS)
import AppKit
import SwiftUI

/// Content determines the height; only content beyond the available space scrolls.
/// Sheet limits follow the parent window, while Settings follows the usable screen.
struct ContentSizedPanel<Content: SwiftUI.View, Footer: SwiftUI.View>: SwiftUI.View {
    let width: CGFloat
    var settings = false
    var pane: String? = nil
    var scrollIndicatorOverflowTolerance: CGFloat = 0.5
    @ViewBuilder let content: () -> Content
    @ViewBuilder let footer: () -> Footer
    @State private var contentHeight: CGFloat = 0
    @State private var footerHeight: CGFloat = 0
    @State private var availableHeight: CGFloat = 440
    private var viewportHeight: CGFloat { min(contentHeight, max(1, availableHeight - footerHeight)) }

    var body: some SwiftUI.View {
        VStack(spacing: 0) {
            ScrollView {
                content()
                    .macContentFont(.body)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { contentHeight = $0 }
            }
            .frame(height: viewportHeight)
            .scrollIndicators(contentHeight - viewportHeight > scrollIndicatorOverflowTolerance ? .automatic : .hidden, axes: .vertical)
            .scrollBounceBehavior(.basedOnSize)
            footer()
                .macContentFont(.body)
                .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { footerHeight = $0 }
        }
        .frame(width: width)
        .preference(key: SettingsPaneHeights.self, value: pane.map { [$0: min(contentHeight + footerHeight, availableHeight)] } ?? [:])
        .background(PanelHeightReader(settings: settings) { availableHeight = $0 })
    }
}

extension ContentSizedPanel where Footer == EmptyView {
    init(width: CGFloat, settings: Bool = false, pane: String? = nil, scrollIndicatorOverflowTolerance: CGFloat = 0.5,
         @ViewBuilder content: @escaping () -> Content) {
        self.width = width; self.settings = settings; self.pane = pane
        self.scrollIndicatorOverflowTolerance = scrollIndicatorOverflowTolerance
        self.content = content; footer = { EmptyView() }
    }
}

struct PanelHeightReader: NSViewRepresentable {
    let settings: Bool
    let changed: (CGFloat) -> Void
    func makeNSView(context: Context) -> HeightView { HeightView(settings: settings, changed: changed) }
    func updateNSView(_ view: HeightView, context: Context) { view.refresh() }

    final class HeightView: NSView {
        let settings: Bool
        let changed: (CGFloat) -> Void
        private var observers: [NSObjectProtocol] = []
        init(settings: Bool, changed: @escaping (CGFloat) -> Void) {
            self.settings = settings; self.changed = changed
            super.init(frame: .zero)
        }
        required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow()
            for observer in observers { NotificationCenter.default.removeObserver(observer) }
            observers = []
            guard window != nil else { return }
            // A sheet can join its parent after viewDidMoveToWindow. Observe window
            // changes without binding to that initial, possibly unattached window.
            for name in [NSWindow.didResizeNotification, NSWindow.didChangeScreenNotification, NSWindow.willBeginSheetNotification] {
                observers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                    Task { @MainActor in self?.refresh() }
                })
            }
            refresh()
        }
        func refresh() {
            guard let window else { return }
            let height: CGFloat
            if settings { height = (window.screen?.visibleFrame.height ?? 800) - 120 }
            else { height = (window.sheetParent?.contentLayoutRect.height ?? 500) - 48 }
            Task { @MainActor [weak self] in self?.changed(max(1, height)) }
        }
        isolated deinit { for observer in observers { NotificationCenter.default.removeObserver(observer) } }
    }
}

struct SettingsPaneHeights: PreferenceKey {
    static let width: CGFloat = 580
    static let defaultValue: [String: CGFloat] = [:]
    static func reduce(value: inout [String: CGFloat], nextValue: () -> [String: CGFloat]) {
        value.merge(nextValue(), uniquingKeysWith: { _, height in height })
    }
}

/// A grouped Form owns a scroll view, so its ideal size is the viewport rather
/// than the rows. Measure the scroll content before applying the screen cap.
private struct ContentSizedSettingsForm: ViewModifier {
    let pane: String
    @State private var contentHeight: CGFloat = 440
    @State private var availableHeight: CGFloat = 680
    // Short panes fit their rows; long ones stop at a height that opens fully on
    // screen wherever Settings is placed, and scroll.
    private var height: CGFloat { min(contentHeight, availableHeight, 680) }

    func body(content: Content) -> some SwiftUI.View {
        content
            .onScrollGeometryChange(for: CGFloat.self) { geometry in
                // The top inset also reserves the toolbar, which the Settings window adds
                // above the pane itself; the grouped form's own margins are symmetric.
                ceil(geometry.contentSize.height + 2 * geometry.contentInsets.bottom)
            } action: { _, measured in
                if measured > 0 { contentHeight = measured }
            }
            .frame(width: SettingsPaneHeights.width, height: height)
            .preference(key: SettingsPaneHeights.self, value: [pane: height])
            .background(PanelHeightReader(settings: true) { availableHeight = $0 })
    }
}

extension SwiftUI.View {
    func contentSizedSettingsForm(pane: String) -> some SwiftUI.View {
        modifier(ContentSizedSettingsForm(pane: pane))
    }
}
#endif
