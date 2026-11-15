import Foundation
import OSLog
import PodListData

/// Only authored recovery copy crosses the UI boundary. Diagnostics stay in the log.
enum FailureOperation: CaseIterable {
    case action, playlistEdit, undo, redo, playback, download, removeDownload, downloadRules, bringOver, automationStart, automationStop

    var message: String {
        switch self {
        case .action: "Could not complete this action. Try again."
        case .playlistEdit: "Could not save the Playlist change. Try again."
        case .undo: "Could not undo the change. Try again."
        case .redo: "Could not redo the change. Try again."
        case .playback: "Playback could not continue. Retry playback. If it keeps failing, reopen PodList."
        case .download: "Could not download the Episode. Check your connection and retry."
        case .removeDownload: "Could not remove the download. Try again. If it keeps failing, reopen PodList."
        case .downloadRules: "Could not apply Download Rules. Try again."
        case .bringOver: "Could not finish bringing over the Library. Check your connection and retry in Settings. Your progress is saved."
        case .automationStart: "Could not start the MCP server on this Mac. Retry. If it keeps failing, reopen PodList."
        case .automationStop: "Could not finish stopping the MCP server on this Mac. Retry. If it keeps failing, reopen PodList."
        }
    }
}

/// Validation produced by our own UI, rather than a server, parser or database diagnostic.
struct FormFailure: Error { let message: String }

extension LibraryMessages {
    private static let logger = Logger(subsystem: "app.podlist", category: "Failures")
    static func log(_ error: any Error, operation: String) {
        logDetails(String(reflecting: error), operation: operation)
    }
    static func logDetails(_ details: String, operation: String) {
        logger.error("\(operation, privacy: .public): \(details, privacy: .private)")
    }
    static func failure(_ error: any Error, operation: FailureOperation) -> String {
        log(error, operation: String(describing: operation))
        // Preserve actionable form validation and explicit compatibility guidance.
        if operation == .playlistEdit || operation == .action, let message = validation(error) { return message }
        return operation.message
    }
    private static func validation(_ error: any Error) -> String? {
        if let failure = error as? FormFailure { return failure.message }
        let reason = (error as? SyncResponseFailure)?.reason ?? (error as? DatabaseFailure)?.description
        switch reason {
        case "This server does not support permanent Playlist deletion. Update the server, then retry.":
            return "This server does not support permanent Playlist deletion. Update the server, then retry."
        case "Enter a Playlist name.": return "Enter a Playlist name."
        case "This Playlist cannot be renamed.": return "This Playlist cannot be renamed. Choose another Playlist."
        case "This Playlist is no longer in Trash.": return "This Playlist is no longer in Trash. Refresh the Library."
        case "Enter an HTTP or HTTPS feed address", "Invalid feed address": return "Enter an HTTP or HTTPS feed address and try again."
        default:
            if let reason, reason.hasPrefix("A Playlist named “"), reason.hasSuffix("” already exists.") {
                return "A Playlist with that name already exists. Choose another name."
            }
            return nil
        }
    }
    static func libraryFailure(_ error: any Error) -> String {
        log(error, operation: "Library action")
        if let message = validation(error) { return message }
        if error is FeedFailure { return "Could not read the podcast feed. Try again later, or check the feed address with the publisher." }
        if let failure = error as? HttpFailure {
            return failure.status == 404 ? "The podcast or server could not be found. Check the address and try again." : "The podcast or server could not complete the request. Try again later."
        }
        if error is URLError { return "Could not reach the podcast or server. Check your connection and try again." }
        if error is DecodingError || error is SyncResponseFailure { return "The podcast or server response could not be read. Try again. If it keeps failing, check for updates." }
        return FailureOperation.action.message
    }
    static func bringOverIssues(_ issues: [String]) -> String? {
        guard !issues.isEmpty else { return nil }
        logDetails(issues.joined(separator: "\n"), operation: "Bring over Library")
        return FailureOperation.bringOver.message
    }
}
