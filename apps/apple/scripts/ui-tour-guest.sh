#!/bin/bash
# Internal entry point for native tours and Electron runs in a fresh Tart clone.
set -euo pipefail
[ "$#" -eq 2 ] || exit 2
run="$1"
mode="$2"
shared='/Volumes/My Shared Files'
[ "$run" = /private/tmp/podlist-uitour-run ] && [ -d "$shared/run" ] || {
    echo 'Guest runner requires the disposable Tart staging directory and share' >&2; exit 2;
}
case "$mode" in tour|system|timings|electron-timings|electron-tests) ;; *) exit 2;; esac
rm -rf "$run"
mkdir -p "$run"
touch "$run/uitour-vm"
for item in light dark borders-light borders-dark sidebar-light sidebar-dark system products checks; do
    if [ -d "$shared/run/$item" ]; then ditto "$shared/run/$item" "$run/$item"; fi
done
# Only the disposable VM copies advertise the scheme, Service and Share extension.
# PlistBuddy splits its command on spaces, and the share path has them.
scripts="$shared/repo/apps/apple/scripts"
cp -f "$scripts/system-integration-keys.plist" "$run/system-integration-keys.plist"
enable_integration() {
    local app="$1"
    /usr/libexec/PlistBuddy -c "Merge $run/system-integration-keys.plist" "$app/Contents/Info.plist"
    /bin/bash "$scripts/embed-mac-share-extension.sh" "$app" "$shared/run/PodListShare"
    codesign --force --sign - "$app"
}
for app in "$run"/*/PodList.app; do
    [ -d "$app" ] || continue
    [ "$app" != "$run/system/PodList.app" ] || continue
    enable_integration "$app"
done
demo_pids=""
warmup=""
result=0
reset_show_borders=false
diagnostics="$shared/run/guest-diagnostics"
spotlight_start=""
tour_start=""
spotlight_status() {
    local phase="$1" volume status
    echo "=== $phase ($(date)) ==="
    for volume in / /System/Volumes/Data; do
        status="$(LC_ALL=C /usr/bin/mdutil -s "$volume" 2>&1)" || true
        printf '%s\n' "$status"
        if [ "$phase" = "Before app launch" ] && [[ "$status" =~ Indexing(\ and\ searching)?\ disabled ]]; then
            echo "Enabling Spotlight indexing on $volume"
            sudo -n /usr/bin/mdutil -i on "$volume" || echo "Could not enable indexing on $volume"
            LC_ALL=C /usr/bin/mdutil -s "$volume" || true
        fi
    done
    printf 'corespotlightd PID(s):\n'
    pgrep -x corespotlightd || echo 'No running corespotlightd'
}
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
memory_pid=""
start_memory() {
    /usr/bin/python3 "$scripts/response-memory.py" "$run" "$mode" &
    memory_pid=$!
}
stop_memory() {
    if [ -z "$memory_pid" ]; then return; fi
    touch "$run/memory-stop"
    wait "$memory_pid" || echo 'Guest memory sampling failed; see the guest log' >&2
    if [ -f "$run/memory.txt" ]; then cp -f "$run/memory.txt" "$shared/run/memory.txt"; fi
}
profiler=""
# Record an Instruments trace for each main pass's response-timing runs.
# os_signpost captures the named ResponseTiming category.
profile_timings() {
    local seen=0 count pid out trace template
    template="$(cat "$shared/run/profile")"
    while sleep 1; do
        [ ! -f "$run/profile-finished" ] || return 0
        count="$(grep -c 'Begin response timing runs' "$test_output" 2>/dev/null || true)"
        [ "${count:-0}" -gt "$seen" ] || continue
        seen="$count"
        pid="$(pgrep -nx PodListMac || true)"
        [ -n "$pid" ] || continue
        out="$diagnostics/timings-profile-$seen"
        trace="$run/timings-profile-$seen.trace"
        mkdir -p "$diagnostics"
        if xcrun xctrace record --template "$template" --instrument os_signpost --attach "$pid" \
            --time-limit 150s --output "$trace" > "$out-xctrace.log" 2>&1; then
            xcrun xctrace export --input "$trace" --toc --output "$out-toc.xml" \
                >> "$out-xctrace.log" 2>&1 || true
            if ditto "$trace" "$out.trace" >> "$out-xctrace.log" 2>&1; then continue; fi
        fi
        /usr/bin/sample "$pid" 150 1 -mayDie -file "$out-sample.txt" > /dev/null 2>&1 || true
    done
}
run_tests() {
    # pipefail makes a failed xcodebuild the pipeline's status; record it and go on.
    xcodebuild test-without-building "$@" 2>&1 | tee -a "$test_output" || result=$?
}
stop_demos() {
    local pid
    for pid in $demo_pids; do kill "$pid" 2>/dev/null || true; done
    for pid in $demo_pids; do wait "$pid" 2>/dev/null || true; done
    demo_pids=""
}
finish() {
    local status=$?
    if [ "$mode" = electron-tests ]; then
        if [ -d "$run/electron-tests" ]; then
            ditto "$run/electron-tests" "$shared/run/electron-tests" || status=$?
        fi
        printf '%s\n' "$status" > "$shared/run/electron-tests.status" || status=$?
        exit "$status"
    fi
    stop_memory || status=$?
    if [ -n "$watcher" ]; then kill "$watcher" 2>/dev/null || true; wait "$watcher" 2>/dev/null || true; fi
    if [ -n "$profiler" ]; then
        # Let an in-flight trace and its TOC reach the share before the host deletes the VM.
        touch "$run/profile-finished"
        wait "$profiler" 2>/dev/null || true
    fi
    if [ "$reset_show_borders" = true ]; then set_show_borders false || status=$?; fi
    # Preserve partial evidence even when a check fails. The host deletes the whole VM.
    if [ -n "$warmup" ]; then kill "$warmup" 2>/dev/null || true; wait "$warmup" 2>/dev/null || true; fi
    stop_demos
    cp -f "$run/demo.log" "$shared/run/guest-demo.log" 2>/dev/null || true
    if [ "$mode" = electron-timings ]; then
        if [ -f "$run/timings.txt" ]; then cp -f "$run/timings.txt" "$shared/run/timings.txt" || status=$?; fi
        exit "$status"
    fi
    mkdir -p "$diagnostics"
    cp -f ~/Library/Logs/DiagnosticReports/*PodList* "$diagnostics/" 2>/dev/null || true
    log show --last 15m --style compact --predicate 'process CONTAINS "PodList" OR process == "Shortcuts" OR process == "appintentsd" OR process == "lsd" OR process == "testmanagerd" OR process == "corespotlightd" OR process == "mds" OR process == "mds_stores" OR process == "automationmodetool" OR subsystem == "com.apple.dt.xctest"' \
        > "$diagnostics/log.txt" 2>&1 || true
    if [ -n "$tour_start" ]; then
        log show --start "$tour_start" --style compact --predicate 'subsystem == "app.podlist" AND category == "TourEditHistory"' \
            > "$diagnostics/edit-history.log" 2>&1 || true
    fi
    if [ -n "$spotlight_start" ]; then
        log show --start "$spotlight_start" --style compact --info --predicate 'subsystem == "app.podlist"' \
            > "$diagnostics/podlist.log" 2>&1 || true
        spotlight_status "After system checks" >> "$diagnostics/spotlight-status.txt" 2>&1
        log show --start "$spotlight_start" --style compact --info --predicate \
            '(process == "PodListMac" AND (subsystem == "com.apple.corespotlight" OR category == "BiomeCascade" OR (subsystem == "app.podlist" AND category == "Spotlight"))) OR process == "SetStoreUpdateService" OR eventMessage CONTAINS "com.apple.SetStoreUpdateService" OR (process == "corespotlightd" AND (messageType == error OR messageType == fault))' \
            > "$diagnostics/spotlight.log" 2>&1 || true
    fi
    for bundle in Tour ShowBorders Shortcuts MCP Integration; do
        if [ -d "$run/$bundle.xcresult" ]; then ditto "$run/$bundle.xcresult" "$shared/run/$bundle.xcresult"; fi
    done
    if [ "$mode" = system ]; then
        mkdir -p "$shared/run/system-results"
        for file in "$run/system"/mcp-* "$run/system"/app-* "$run/system"/share-* "$run/system/catalog.json"; do
            [ ! -f "$file" ] || cp -f "$file" "$shared/run/system-results/"
        done
    fi
    exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
if [ "$mode" = system ]; then
    mkdir -p "$diagnostics"
    spotlight_start="$(date '+%Y-%m-%d %H:%M:%S')"
    spotlight_status "Before app launch" > "$diagnostics/spotlight-status.txt" 2>&1
else
    tour_start="$(date '+%Y-%m-%d %H:%M:%S')"
fi
demo_now="$(node -e 'console.log(Date.now())')"
: > "$run/demo.log"
wait_for_demo() {
    local origin="$1" pid="$2" i
    for ((i = 0; i < 600; i++)); do
        [ ! -s "$origin" ] || return 0
        if ! kill -0 "$pid" 2>/dev/null; then break; fi
        sleep 0.1
    done
    cat "$run/demo.log"
    return 1
}
start_demo() {
    local origin="$1" variant="${2:-}" pid
    PODLIST_TEST_DEMO_NOW="$demo_now" node "$shared/run/demo.mjs" \
        "$shared/repo/packages/web/ui-flows/demo.mjs" "$origin" "$variant" >> "$run/demo.log" 2>&1 &
    pid=$!
    demo_pids="$demo_pids $pid"
    wait_for_demo "$origin" "$pid"
}
settle_guest() {
    # Boot services and indexing roughly triple these figures until the guest settles.
    local settle_start=$SECONDS elapsed load remaining
    while :; do
        load="$(sysctl -n vm.loadavg | awk '{print $2}')"
        elapsed=$((SECONDS - settle_start))
        echo "Guest load average before $mode: $load (${elapsed}s elapsed)"
        if awk -v l="$load" 'BEGIN { exit !(l != "" && l < 0.8) }'; then
            echo "Guest settled after ${elapsed}s"
            break
        fi
        if [ "$elapsed" -ge 720 ]; then
            echo "Guest settle wait reached 12 minutes; proceeding with $mode at load $load"
            break
        fi
        remaining=$((720 - elapsed))
        if [ "$remaining" -lt 10 ]; then sleep "$remaining"; else sleep 10; fi
    done
}
case "$mode" in
    electron-timings|electron-tests)
        # Use the host-built desktop assets from the same read-only checkout as the demo.
        export PODLIST_TEST_WEB_ROOT="$shared/repo/packages/web/dist-desktop"
        sleep 30
        settle_guest
        if [ "$mode" = electron-tests ]; then
            # The MCP socket is inside a test profile, so keep its Unix socket path short.
            export TMPDIR="$run/tmp"
            export PODLIST_ELECTRON_TEST_OUTPUT="$run/electron-tests"
            mkdir -p "$TMPDIR" "$PODLIST_ELECTRON_TEST_OUTPUT"
            cd "$shared/repo/packages/desktop"
            env -u ELECTRON_RUN_AS_NODE -u PODLIST_URL -u PWDEBUG \
                PODLIST_HIDDEN_WINDOW=0 PODLIST_WEB_ROOT="$PODLIST_TEST_WEB_ROOT" \
                node node_modules/playwright/cli.js test --config playwright.config.ts
        else
            start_demo "$run/origin"
            start_memory
            env -u ELECTRON_RUN_AS_NODE node "$shared/repo/packages/desktop/test/response-timings.ts" "$run"
        fi
        exit 0
        ;;
esac
if [ "$mode" = tour ]; then
    # The apps have separate local stores, but a shared demo server would sync
    # a failed pass's saved edits into the next appearance.
    start_demo "$run/dark/origin"
    start_demo "$run/light/origin"
    start_demo "$run/sidebar-origin" large-sidebar
else
    start_demo "$run/origin"
fi
# Login banners can obscure screenshots.
sleep 30
cd "$run/products"
xctestruns=(*.xctestrun)
[ "${#xctestruns[@]}" -eq 1 ] || { echo 'Expected one xctestrun' >&2; exit 1; }
xctestrun="${xctestruns[0]}"
if [ "$mode" != tour ]; then
    /usr/libexec/PlistBuddy -c "Set :PodListUITour:EnvironmentVariables:PODLIST_UI_SERVER_ORIGIN $(cat "$run/origin")" "$xctestrun"
fi
if [ "$mode" = timings ] || [ "$mode" = tour ]; then
    settle_guest
fi
if [ "$mode" = timings ]; then
    start_memory
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
        -test-timeouts-enabled YES -default-test-execution-time-allowance 3000 \
        -maximum-test-execution-time-allowance 3600 -resultBundlePath "$run/Tour.xcresult"
    # Preserve the main pass even if xcodebuild stalls before the Borders tests start.
    if [ -d "$run/Tour.xcresult" ]; then ditto "$run/Tour.xcresult" "$shared/run/Tour.xcresult"; fi
    stop_demos
    start_demo "$run/borders-dark/origin"
    start_demo "$run/borders-light/origin"
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
    enable_integration "$app" > "$run/system/app-registration.log" 2>&1
    codesign --verify --deep --strict --verbose "$app" >> "$run/system/app-registration.log" 2>&1
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
    share_id=app.podlist.uitour.system.share
    share_path="$app/Contents/PlugIns/PodListShare.appex"
    share_log="$run/system/share-registration.log"
    for ((attempt = 0; attempt < 30; attempt++)); do
        /usr/bin/pluginkit -m -v -p com.apple.share-services -i "$share_id" > "$share_log" 2>&1 || true
        if /usr/bin/grep -Fq "$share_path" "$share_log"; then break; fi
        sleep 1
    done
    if /usr/bin/grep -Fq "$share_path" "$share_log"; then
        # Enable this destination in the guest's Share picker for the Safari test.
        printf '\nEnabling %s for this guest\n' "$share_id" >> "$share_log"
        if /usr/bin/pluginkit -e use -i "$share_id" >> "$share_log" 2>&1; then
            for ((attempt = 0; attempt < 10; attempt++)); do
                election="$(/usr/bin/pluginkit -m -v -p com.apple.share-services -i "$share_id" 2>&1)" || true
                if /usr/bin/grep -F "$share_path" <<< "$election" | /usr/bin/grep -Eq '^[[:space:]]*\+'; then break; fi
                sleep 1
            done
            printf '%s\n' "$election" >> "$share_log"
            if [ "$attempt" -eq 10 ]; then
                echo "PlugInKit did not report an enabled election for $share_id" | tee -a "$share_log" >&2
                result=1
            fi
        else
            result=$?
        fi
    else
        echo "PlugInKit did not register $share_id from $app" | tee -a "$share_log" >&2
        result=1
    fi
    xcodebuild test-without-building -xctestrun "$xctestrun" \
        -destination 'platform=macOS' -parallel-testing-enabled NO \
        -only-testing:PodListUITour/PodListSystemChecks/testShortcutsDiscovery \
        -test-timeouts-enabled YES -default-test-execution-time-allowance 600 \
        -maximum-test-execution-time-allowance 900 -resultBundlePath "$run/Shortcuts.xcresult" || result=$?
    xcodebuild test-without-building -xctestrun "$xctestrun" \
        -destination 'platform=macOS' -parallel-testing-enabled NO \
        -only-testing:PodListUITour/PodListSystemChecks/testLibraryLinksAndSpotlight \
        -only-testing:PodListUITour/PodListSystemChecks/testShareFromSafari \
        -test-timeouts-enabled YES -default-test-execution-time-allowance 300 \
        -maximum-test-execution-time-allowance 420 -resultBundlePath "$run/Integration.xcresult" || result=$?
    # Run the independent MCP/window test even if another system check failed.
    /bin/bash "$run/checks/mcp-live-check.sh" "$run" || result=$?
fi
exit "$result"
