import Foundation

/// All app-owned files share a root. UI tests use a disposable bundle identity and
/// a DEBUG-only root; a malformed test launch must never fall back to real data.
public enum ApplicationStorage {
    public static func directory() throws -> URL {
        #if DEBUG
        let environment = ProcessInfo.processInfo.environment
        let identifier = Bundle.main.bundleIdentifier ?? ""
        if environment["PODLIST_UI_DATA_DIRECTORY"] != nil || identifier.hasPrefix("app.podlist.uitour.") {
            return try isolatedDirectory(environment["PODLIST_UI_DATA_DIRECTORY"], bundleIdentifier: identifier)
        }
        #endif
        return try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                          appropriateFor: nil, create: true)
            .appendingPathComponent("PodList", isDirectory: true)
    }

    #if DEBUG
    public static func isolatedDirectory(_ path: String?, bundleIdentifier: String) throws -> URL {
        guard bundleIdentifier.hasPrefix("app.podlist.uitour."),
              let path, path.hasPrefix("/"), !path.contains("..") else {
            throw AutomationFailure("UI tests require a disposable bundle identity and an absolute data directory.")
        }
        let url = URL(fileURLWithPath: path, isDirectory: true).standardizedFileURL.resolvingSymlinksInPath()
        let temporary = URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true).resolvingSymlinksInPath()
        // resolvingSymlinksInPath turns /private/tmp/… into /tmp/…, so accept both spellings.
        guard url.path.hasPrefix(temporary.path + "/") || url.path.hasPrefix("/private/tmp/")
                || url.path.hasPrefix("/tmp/") else {
            throw AutomationFailure("The UI test data directory must be inside a temporary directory.")
        }
        return url
    }
    #endif
}
