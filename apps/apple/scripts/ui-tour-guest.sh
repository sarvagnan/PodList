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
case "$mode" in tour|system) ;; *) exit 2;; esac
rm -rf "$run"
mkdir -p "$run"
touch "$run/uitour-vm"
for item in light dark system products checks; do
    if [ -d "$shared/run/$item" ]; then ditto "$shared/run/$item" "$run/$item"; fi
done
# Only these disposable VM copies advertise the podlist:// scheme and the Service.
# PlistBuddy splits its command on spaces, and the share path has them.
cp -f "$shared/repo/apps/apple/scripts/system-integration-keys.plist" "$run/system-integration-keys.plist"
for app in "$run"/light/PodList.app "$run"/dark/PodList.app "$run"/system/PodList.app; do
    [ -d "$app" ] || continue
    /usr/libexec/PlistBuddy -c "Merge $run/system-integration-keys.plist" "$app/Contents/Info.plist"
    codesign --force --sign - "$app"
done
demo=""
warmup=""
result=0
finish() {
    # Preserve partial evidence even when a check fails. The host deletes the whole VM.
    if [ -n "$warmup" ]; then kill "$warmup" 2>/dev/null || true; wait "$warmup" 2>/dev/null || true; fi
    if [ -n "$demo" ]; then kill "$demo" 2>/dev/null || true; wait "$demo" 2>/dev/null || true; fi
    cp -f "$run/demo.log" "$shared/run/guest-demo.log" 2>/dev/null || true
    mkdir -p "$shared/run/guest-diagnostics"
    cp -f ~/Library/Logs/DiagnosticReports/*PodList* "$shared/run/guest-diagnostics/" 2>/dev/null || true
    log show --last 15m --style compact --predicate 'process CONTAINS "PodList" OR process == "Shortcuts" OR process == "appintentsd" OR process == "lsd" OR process == "testmanagerd" OR process == "automationmodetool" OR subsystem == "com.apple.dt.xctest"' \
        > "$shared/run/guest-diagnostics/log.txt" 2>&1 || true
    for bundle in Tour Shortcuts MCP Integration; do
        if [ -d "$run/$bundle.xcresult" ]; then ditto "$run/$bundle.xcresult" "$shared/run/$bundle.xcresult"; fi
    done
    if [ "$mode" = system ]; then
        mkdir -p "$shared/run/system-results"
        for file in "$run/system"/mcp-* "$run/system"/app-* "$run/system/catalog.json"; do
            [ ! -f "$file" ] || cp -f "$file" "$shared/run/system-results/"
        done
    fi
}
trap finish EXIT
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
if [ "$mode" = tour ]; then
    xcodebuild test-without-building -xctestrun "$xctestrun" \
        -destination 'platform=macOS' -parallel-testing-enabled NO \
        -only-testing:PodListUITour/PodListUITour \
        -test-timeouts-enabled YES -default-test-execution-time-allowance 900 \
        -maximum-test-execution-time-allowance 1200 -resultBundlePath "$run/Tour.xcresult" || result=$?
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
