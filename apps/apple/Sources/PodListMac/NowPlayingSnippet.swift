import AppIntents
import PodListUI
import SwiftUI

struct NowPlayingIntent: AppIntent {
    static let title: LocalizedStringResource = "Show Now Playing"
    static let supportedModes: IntentModes = .foreground
    @MainActor func perform() async throws -> some IntentResult & ShowsSnippetIntent {
        .result(snippetIntent: NowPlayingSnippetIntent())
    }
}

/// Rendering reads live state each time; only the button intents change playback.
struct NowPlayingSnippetIntent: SnippetIntent {
    static let title: LocalizedStringResource = "Now Playing"
    static let isDiscoverable = false
    @MainActor func perform() async throws -> some IntentResult & ShowsSnippetView {
        _ = try await AutomationRuntime.perform("now_playing")
        return .result(view: NowPlayingSnippetView(display: AutomationRuntime.app?.playback?.display))
    }
}

struct SnippetPlaybackIntent: AppIntent {
    static let title: LocalizedStringResource = "Now Playing Control"
    static let isDiscoverable = false
    @Parameter(title: "Action") var action: TransportAction
    init() {}
    init(_ action: TransportAction) { self.action = action }
    @MainActor func perform() async throws -> some IntentResult {
        _ = try await AutomationRuntime.perform(action.action)
        NowPlayingSnippetIntent.reload()
        return .result()
    }
}

private struct NowPlayingSnippetView: View {
    let display: PlaybackDisplay?
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Now Playing").font(.caption).foregroundStyle(.secondary)
            if let display {
                Text(display.title).font(.headline).lineLimit(2)
                Text(display.podcast).font(.subheadline).foregroundStyle(.secondary)
                Text(Presentation.time(display.position)).monospacedDigit()
                    .accessibilityLabel("Position \(Presentation.time(display.position))")
                HStack(spacing: 24) {
                    Button(intent: SnippetPlaybackIntent(.skipBack)) { Label("Back 15 seconds", systemImage: "gobackward.15") }
                    Button(intent: SnippetPlaybackIntent(.toggle)) {
                        Label(display.playing ? "Pause" : "Play", systemImage: display.playing ? "pause.fill" : "play.fill")
                    }
                    Button(intent: SnippetPlaybackIntent(.skipForward)) { Label("Forward 30 seconds", systemImage: "goforward.30") }
                }
                .labelStyle(.iconOnly)
                .buttonStyle(.bordered)
            } else {
                Text("No current Episode").font(.headline)
                Text("Choose an Episode in PodList to begin.").foregroundStyle(.secondary)
            }
        }
        .padding()
    }
}
