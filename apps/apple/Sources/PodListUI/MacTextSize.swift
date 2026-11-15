#if os(macOS)
import Foundation
import SwiftUI

/// Device-local reading preference, shared by commands and every window.
@MainActor @Observable public final class MacTextSizePreference {
    static let key = "PodList.textSizePercent"
    static let bounds = 100...200
    static let step = 10
    private let defaults: UserDefaults
    public var percent: Int {
        didSet {
            let bounded = Self.clamp(percent)
            if bounded != percent { percent = bounded }
            defaults.set(bounded, forKey: Self.key)
        }
    }
    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        let saved = defaults.object(forKey: Self.key) == nil ? 100 : defaults.integer(forKey: Self.key)
        percent = Self.clamp(saved)
    }
    static func clamp(_ percent: Int) -> Int { min(bounds.upperBound, max(bounds.lowerBound, percent)) }
    public var scale: CGFloat { CGFloat(percent) / 100 }
    public var canGrow: Bool { percent < Self.bounds.upperBound }
    public var canShrink: Bool { percent > Self.bounds.lowerBound }
    public func bigger() { percent += Self.step }
    public func smaller() { percent -= Self.step }
    public func actualSize() { percent = 100 }
}

extension EnvironmentValues {
    @Entry var macTextScale: CGFloat = 1
}

private struct MacContentFont: ViewModifier {
    @Environment(\.macTextScale) private var scale
    let font: Font
    func body(content: Content) -> some SwiftUI.View { content.font(scale == 1 ? font : font.scaled(by: scale)) }
}

public extension SwiftUI.View {
    /// Set once per scene. Presentations inherit the environment, not a visual transform.
    func macTextSize(_ preference: MacTextSizePreference) -> some SwiftUI.View {
        environment(preference).environment(\.macTextScale, preference.scale)
    }
}

extension SwiftUI.View {
    func macContentFont(_ font: Font) -> some SwiftUI.View { modifier(MacContentFont(font: font)) }
}

struct MacTextSizeControl: SwiftUI.View {
    @Environment(MacTextSizePreference.self) private var preference
    var body: some SwiftUI.View {
        @Bindable var preference = preference
        Picker("Text Size", selection: $preference.percent) {
            ForEach(Array(stride(from: 100, through: 200, by: 10)), id: \.self) { percent in
                Text("\(percent)%").tag(percent)
            }
        }
        Text("Enlarges reading text in all windows. You can also use View › Bigger or Smaller.")
            .macContentFont(.caption).foregroundStyle(.primary)
    }
}

public struct MacTextSizeCommands: Commands {
    private let preference: MacTextSizePreference
    public init(preference: MacTextSizePreference) { self.preference = preference }
    public var body: some Commands {
        CommandGroup(after: .sidebar) {
            Divider()
            Button("Bigger") { preference.bigger() }
                .keyboardShortcut("+", modifiers: .command).disabled(!preference.canGrow)
            Button("Smaller") { preference.smaller() }
                .keyboardShortcut("-", modifiers: .command).disabled(!preference.canShrink)
            Button("Actual Size") { preference.actualSize() }
                .keyboardShortcut("0", modifiers: .command).disabled(preference.percent == 100)
        }
    }
}

/// At enlarged sizes, metadata flows below the title instead of competing for
/// fixed table columns. A native List keeps selection, keyboard and menu behavior.
struct MacReadingRow<Title: SwiftUI.View>: SwiftUI.View {
    @ViewBuilder let title: () -> Title
    let metadata: () -> String
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 6) {
            title()
            Text(metadata()).macContentFont(.caption).foregroundStyle(.primary)
        }
        .lineLimit(nil).fixedSize(horizontal: false, vertical: true).padding(.vertical, 6)
    }
}
/// The same persisted sort is used by column headers and the reading layout.
struct MacReadingSortControl: SwiftUI.View {
    @Binding var sort: [WindowSort]
    var body: some SwiftUI.View {
        ViewThatFits(in: .horizontal) {
            HStack { controls }
            VStack(alignment: .leading) { controls }
        }.macContentFont(.body).padding(10)
    }
    @ViewBuilder private var controls: some SwiftUI.View {
        Picker("Sort by", selection: Binding(get: { sort.first?.column }, set: { column in
            sort = column.map { [.init(column: $0, reversed: sort.first?.reversed ?? false)] } ?? []
        })) {
            Text("Default order").tag(Optional<WindowSort.Column>.none)
            Text("Title").tag(Optional(WindowSort.Column.title))
            Text("Published").tag(Optional(WindowSort.Column.published))
            Text("Length").tag(Optional(WindowSort.Column.length))
            Text("State").tag(Optional(WindowSort.Column.state))
        }
        Toggle("Descending", isOn: Binding(get: { sort.first?.reversed ?? false }, set: {
            if !sort.isEmpty { sort[0].reversed = $0 }
        })).disabled(sort.isEmpty)
    }
}
#endif
