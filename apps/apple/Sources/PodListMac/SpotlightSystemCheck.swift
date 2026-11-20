import CoreSpotlight
import Foundation
import OSLog

/// A system check must query Core Spotlight from the app that owns the index.
@MainActor
enum SpotlightSystemCheck {
    private struct Report: Encodable {
        let indexingAvailable: Bool
        var attempts = 0
        var matches: [String: String] = [:]
        var error: String?
    }

    static func start(in dataDirectory: URL) {
        guard Bundle.main.bundleIdentifier == "app.podlist.uitour.system",
              let predicate = ProcessInfo.processInfo.environment["PODLIST_UI_SPOTLIGHT_QUERY"],
              FileManager.default.fileExists(atPath: dataDirectory
                .deletingLastPathComponent().deletingLastPathComponent()
                .appendingPathComponent("system-vm").path) else { return }
        Task {
            let deadline = ContinuousClock.now + .seconds(170)
            var report = Report(indexingAvailable: CSSearchableIndex.isIndexingAvailable())
            do {
                repeat {
                    let context = CSSearchQueryContext()
                    context.fetchAttributes = ["title"]
                    let query = CSSearchQuery(queryString: predicate, queryContext: context)
                    report.attempts += 1
                    for try await result in query.results {
                        let item = result.item
                        report.matches[item.uniqueIdentifier] = item.attributeSet.title ?? ""
                    }
                    if !report.matches.isEmpty { break }
                    try await Task.sleep(for: .seconds(2))
                } while ContinuousClock.now < deadline
            } catch {
                report.error = String(describing: error as NSError)
            }
            do {
                let encoder = JSONEncoder()
                encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
                try encoder.encode(report).write(
                    to: dataDirectory.appendingPathComponent("spotlight-query.json"), options: .atomic)
            } catch {
                Logger(subsystem: "app.podlist", category: "Spotlight")
                    .error("Could not write system check query report: \(error.localizedDescription, privacy: .public)")
            }
        }
    }
}
