import Foundation
#if os(macOS)
import AppKit
#endif

public enum ShareLinks {
    public static func web(_ value: String?) -> URL? {
        guard let text = value?.trimmingCharacters(in: .whitespacesAndNewlines), let url = URL(string: text),
              ["http", "https"].contains(url.scheme?.lowercased() ?? ""), url.host?.isEmpty == false else { return nil }
        return url
    }
    public static func episode(page: String?, enclosure: String?) -> URL? { web(page) ?? web(enclosure) }
    public static func podcast(page: String?, feed: String) -> URL? { web(page) ?? web(feed) }
    #if os(macOS)
    @MainActor public static func copy(_ url: URL) {
        let item = NSPasteboardItem()
        item.setString(url.absoluteString, forType: .string)
        item.setString(url.absoluteString, forType: .URL)
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.writeObjects([item])
    }
    #endif
}
