#!/bin/bash
# Internal entry point shared by the tour and system checks. Runs only in a fresh Tart clone.
set -euo pipefail
[ "$#" -eq 2 ] || exit 2
run="$1"
mode="$2"
shared='/Volumes/My Shared Files'
[ "$run" = /private/tmp/podlist-uitour-run ] && [ -d "$shared/run" ] || {
    echo 'Guest runner requires the disposable Tart staging directory and share' >&2; exit 2;
}
case "$mode" in tour|system|timings) ;; *) exit 2;; esac
rm -rf "$run"
mkdir -p "$run"
touch "$run/uitour-vm"
for item in light dark borders-light borders-dark system products checks; do
    if [ -d "$shared/run/$item" ]; then ditto "$shared/run/$item" "$run/$item"; fi
done
# Only these disposable VM copies advertise the podlist:// scheme and the Service.
# PlistBuddy splits its command on spaces, and the share path has them.
cp -f "$shared/repo/apps/apple/scripts/system-integration-keys.plist" "$run/system-integration-keys.plist"
for app in "$run"/*/PodList.app; do
    [ -d "$app" ] || continue
    /usr/libexec/PlistBuddy -c "Merge $run/system-integration-keys.plist" "$app/Contents/Info.plist"
    codesign --force --sign - "$app"
done
demo=""
warmup=""
result=0
reset_show_borders=false
set_show_borders() {
    /usr/bin/defaults write com.apple.Accessibility ButtonShapesEnabled -bool "$1"
}
# pod-apx.5.89: a rare hang leaves XCUITest retrying a UI query for about a minute.
# Sample PodList while it retries so the next occurrence leaves a main-thread stack.
watcher=""
test_output="$run/xcodebuild-guest.log"
: > "$test_output"
watch_for_hangs() {
    local seen=0 count
    while sleep 5; do
        count="$(grep -c -E '\(retry 1\)|Timed out while evaluating|did not respond' "$test_output" 2>/dev/null || true)"
        [ "${count:-0}" -gt "$seen" ] || continue
        seen="$count"
        mkdir -p "$shared/run/guest-diagnostics"
        /usr/bin/sample PodListMac 10 -file "$shared/run/guest-diagnostics/hang-sample-$(date +%H%M%S).txt" > /dev/null 2>&1 || true
    done
}
profiler=""
# PODLIST_UI_PROFILE=1 on the host: record a Time Profiler trace of PodList for each
# main pass's response-timing runs, falling back to sample(1) if xctrace can't attach.
profile_timings() {
    local seen=0 count pid out
    while sleep 1; do
        count="$(grep -c 'Begin response timing runs' "$test_output" 2>/dev/null || true)"
        [ "${count:-0}" -gt "$seen" ] || continue
        seen="$count"
        pid="$(pgrep -nx PodListMac || true)"
        [ -n "$pid" ] || continue
        out="$shared/run/guest-diagnostics/timings-profile-$seen"
        mkdir -p "$shared/run/guest-diagnostics"
        xcrun xctrace record --template 'Time Profiler' --attach "$pid" --time-limit 150s \
            --output "$run/timings-profile-$seen.trace" > "$out-xctrace.log" 2>&1 \
            && ditto "$run/timings-profile-$seen.trace" "$out.trace" \
            || /usr/bin/sample "$pid" 150 1 -mayDie -file "$out-sample.txt" > /dev/null 2>&1 || true
    done
}
run_tests() {
    # pipefail makes a failed xcodebuild the pipeline's status; record it and go on.
    xcodebuild test-without-building "$@" 2>&1 | tee -a "$test_output" || result=$?
}
finish() {
    local status=$?
    if [ -n "$watcher" ]; then kill "$watcher" 2>/dev/null || true; wait "$watcher" 2>/dev/null || true; fi
    if [ -n "$profiler" ]; then kill "$profiler" 2>/dev/null || true; wait "$profiler" 2>/dev/null || true; fi
    if [ "$reset_show_borders" = true ]; then set_show_borders false || status=$?; fi
    # Preserve partial evidence even when a check fails. The host deletes the whole VM.
    if [ -n "$warmup" ]; then kill "$warmup" 2>/dev/null || true; wait "$warmup" 2>/dev/null || true; fi
    if [ -n "$demo" ]; then kill "$demo" 2>/dev/null || true; wait "$demo" 2>/dev/null || true; fi
    cp -f "$run/demo.log" "$shared/run/guest-demo.log" 2>/dev/null || true
    mkdir -p "$shared/run/guest-diagnostics"
    cp -f ~/Library/Logs/DiagnosticReports/*PodList* "$shared/run/guest-diagnostics/" 2>/dev/null || true
    log show --last 15m --style compact --predicate 'process CONTAINS "PodList" OR process == "Shortcuts" OR process == "appintentsd" OR process == "lsd" OR process == "testmanagerd" OR process == "corespotlightd" OR process == "mds" OR process == "mds_stores" OR process == "automationmodetool" OR subsystem == "com.apple.dt.xctest"' \
        > "$shared/run/guest-diagnostics/log.txt" 2>&1 || true
    for bundle in Tour ShowBorders Shortcuts MCP Integration; do
        if [ -d "$run/$bundle.xcresult" ]; then ditto "$run/$bundle.xcresult" "$shared/run/$bundle.xcresult"; fi
    done
    if [ "$mode" = system ]; then
        mkdir -p "$shared/run/system-results"
        for file in "$run/system"/mcp-* "$run/system"/app-* "$run/system/catalog.json"; do
            [ ! -f "$file" ] || cp -f "$file" "$shared/run/system-results/"
        done
    fi
    exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
PODLIST_TEST_DEMO_NOW="$(node -e 'console.log(Date.now())')" node "$shared/run/demo.mjs" \
    "$shared/repo/packages/web/ui-flows/demo.mjs" "$run/origin" > "$run/demo.log" 2>&1 &
demo=$!
for ((i = 0; i < 600; i++)); do
    [ ! -s "$run/origin" ] || break
    if ! kill -0 "$demo" 2>/dev/null; then cat "$run/demo.log"; exit 1; fi
    sleep 0.1
done
[ -s "$run/origin" ] || { cat "$run/demo.log"; exit 1; }
# Login banners can obscure screenshots.
sleep 30
cd "$run/products"
xctestruns=(*.xctestrun)
[ "${#xctestruns[@]}" -eq 1 ] || { echo 'Expected one xctestrun' >&2; exit 1; }
xctestrun="${xctestruns[0]}"
/usr/libexec/PlistBuddy -c "Set :PodListUITour:EnvironmentVariables:PODLIST_UI_SERVER_ORIGIN $(cat "$run/origin")" "$xctestrun"
if [ "$mode" = timings ]; then
    # A freshly booted clone indexes and launches services for several minutes, which
    # roughly triples these figures. Wait (up to 12 min) for the 1-minute load to settle.
    for ((i = 0; i < 72; i++)); do
        load="$(sysctl -n vm.loadavg | awk '{print $2}')"
        echo "Guest load average before timings: $load"
        awk -v l="$load" 'BEGIN { exit !(l < 0.8) }' && break
        sleep 10
    done
    if [ -f "$shared/run/profile" ]; then profile_timings & profiler=$!; fi
    set_show_borders false
    run_tests -xctestrun "$xctestrun" \
        -destination 'platform=macOS' -parallel-testing-enabled NO \
        -only-testing:PodListUITour/PodListUITour/testTimingsLight \
        -test-timeouts-enabled YES -default-test-execution-time-allowance 600 \
        -maximum-test-execution-time-allowance 900 -resultBundlePath "$run/Tour.xcresult"
elif [ "$mode" = tour ]; then
    watch_for_hangs &
    watcher=$!
    if [ -f "$shared/run/profile" ]; then profile_timings & profiler=$!; fi
    set_show_borders false
    run_tests -xctestrun "$xctestrun" \
        -destination 'platform=macOS' -parallel-testing-enabled NO \
        -only-testing:PodListUITour/PodListUITour/testLight \
        -only-testing:PodListUITour/PodListUITour/testDark \
        -test-timeouts-enabled YES -default-test-execution-time-allowance 1100 \
        -maximum-test-execution-time-allowance 1400 -resultBundlePath "$run/Tour.xcresult"
    # Launch a fresh test runner after changing the display preference.
    reset_show_borders=true
    set_show_borders true
    run_tests -xctestrun "$xctestrun" \
        -destination 'platform=macOS' -parallel-testing-enabled NO \
        -only-testing:PodListUITour/PodListUITour/testBordersLight \
        -only-testing:PodListUITour/PodListUITour/testBordersDark \
        -test-timeouts-enabled YES -default-test-execution-time-allowance 300 \
        -maximum-test-execution-time-allowance 420 -resultBundlePath "$run/ShowBorders.xcresult"
else
    touch "$run/system-vm"
    # This script is invoked only by tart exec in a throwaway clone. Installation,
    # the fixed test identity and LaunchServices registration never touch the host.
    app='/Applications/PodList UI Check.app'
    ditto "$run/system/PodList.app" "$app"
    /usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier app.podlist.uitour.system' "$app/Contents/Info.plist"
    codesign --force --sign - "$app" > "$run/system/app-registration.log" 2>&1
    /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
        -f "$app" >> "$run/system/app-registration.log" 2>&1
    PODLIST_UI_DATA_DIRECTORY="$run/system/data" "$app/Contents/MacOS/PodListMac" \
        -PodList.serverOrigin "$(cat "$run/origin")" -PodList.mcpEnabled NO \
        -AppleLanguages '(en)' -AppleLocale en_US -ApplePersistenceIgnoreState YES \
        > "$run/system/app-warmup.log" 2>&1 &
    warmup=$!
    # Give appintentsd time to ingest the installed app before opening Shortcuts.
    sleep 30
    kill -0 "$warmup" || { echo 'Installed test app exited during indexing warmup' >&2; exit 1; }
    kill "$warmup"
    wait "$warmup" || true
    warmup=""
    xcodebuild test-without-building -xctestrun "$xctestrun" \
        -destination 'platform=macOS' -parallel-testing-enabled NO \
        -only-testing:PodListUITour/PodListSystemChecks/testShortcutsDiscovery \
        -test-timeouts-enabled YES -default-test-execution-time-allowance 600 \
        -maximum-test-execution-time-allowance 900 -resultBundlePath "$run/Shortcuts.xcresult" || result=$?
    xcodebuild test-without-building -xctestrun "$xctestrun" \
        -destination 'platform=macOS' -parallel-testing-enabled NO \
        -only-testing:PodListUITour/PodListSystemChecks/testLibraryLinksAndSpotlight \
        -test-timeouts-enabled YES -default-test-execution-time-allowance 300 \
        -maximum-test-execution-time-allowance 420 -resultBundlePath "$run/Integration.xcresult" || result=$?
    # Run the independent MCP/window test even if another system check failed.
    /bin/bash "$run/checks/mcp-live-check.sh" "$run" || result=$?
fi
exit "$result"
