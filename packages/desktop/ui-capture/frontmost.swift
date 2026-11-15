// Observe activation events rather than assuming the owner's frontmost app stays
// the same. Only PIDs are recorded; no titles, paths or personal app content.
import AppKit

func record(_ phase: String, _ app: NSRunningApplication?) {
    let pid = app?.processIdentifier ?? 0
    print("\(phase) \(pid)")
    fflush(stdout)
}

let workspace = NSWorkspace.shared
let observer = workspace.notificationCenter.addObserver(
    forName: NSWorkspace.didActivateApplicationNotification, object: nil, queue: .main
) { notification in
    record("activation", notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication)
}

FileHandle.standardInput.readabilityHandler = { input in
    let data = input.availableData
    if data.isEmpty || String(data: data, encoding: .utf8)?.contains("stop") == true {
        DispatchQueue.main.async {
            record("after", workspace.frontmostApplication)
            exit(0)
        }
    }
}
record("before", workspace.frontmostApplication)
RunLoop.main.run()
