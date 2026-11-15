import Foundation
import Observation
import PodListDomain

/// Settings owns its drafts and feedback even when the Library window is closed.
@MainActor @Observable
final class GeneralSettingsEdits {
    var playback: PlaybackSettings
    var trashDays: Int64
    private(set) var failures: [String: String] = [:]
    @ObservationIgnored private var pending: Task<Void, Never>?
    private var pendingCount = 0

    init(playback: PlaybackSettings, trashDays: Int64) {
        self.playback = playback; self.trashDays = trashDays
    }

    func save(_ change: Change, setting: String, using editor: PlaylistEditingModel) {
        let previous = pending
        pendingCount += 1
        pending = Task {
            await previous?.value
            defer { pendingCount -= 1 }
            if await editor.edit([change], name: setting, reload: true) {
                failures[setting] = nil
                // Each playback change writes the complete draft, including any
                // previously failed playback fields.
                if case .setPlaybackSettings = change {
                    for field in ["Speed", "Skip intro", "Skip outro", "Volume boost"] { failures[field] = nil }
                }
            } else {
                failures[setting] = "Could not save \(setting). \(editor.error ?? "Another Library edit is in progress.") Your draft is kept. Retry to save it."
            }
        }
    }

    func reconcile(playback: PlaybackSettings, trashDays: Int64) {
        guard pendingCount == 0 else { return }
        if !["Speed", "Skip intro", "Skip outro", "Volume boost"].contains(where: { failures[$0] != nil }) { self.playback = playback }
        if failures["Keep Playlists in Trash"] == nil { self.trashDays = trashDays }
    }

    func waitForPendingEdits() async { await pending?.value }
}
