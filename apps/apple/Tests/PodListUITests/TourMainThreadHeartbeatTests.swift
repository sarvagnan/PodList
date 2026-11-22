#if (DEBUG || PODLIST_UI_TOUR) && os(macOS)
import Testing
@testable import PodListUI

@Test func tourWatchdogSamplesOncePerMissedHeartbeat() {
    let now = ContinuousClock.now
    var heartbeat = TourMainThreadHeartbeat()
    #expect(heartbeat.tick(at: now) == .ping)
    for second in 1..<5 {
        #expect(heartbeat.tick(at: now + .seconds(second)) == nil)
    }
    #expect(heartbeat.tick(at: now + .seconds(5)) == .sample(.seconds(5)))
    for second in 6..<30 {
        #expect(heartbeat.tick(at: now + .seconds(second)) == nil)
    }

    heartbeat.acknowledge()
    #expect(heartbeat.tick(at: now + .seconds(30)) == .ping)
    heartbeat.acknowledge()
    #expect(heartbeat.tick(at: now + .seconds(34)) == .ping)
    #expect(heartbeat.tick(at: now + .seconds(38)) == nil)
    #expect(heartbeat.tick(at: now + .seconds(39)) == .sample(.seconds(5)))
}
#endif
