#!/bin/bash
# Build on this Mac; run XCUITest only inside a fresh throwaway Tart clone.
# PODLIST_BUILD_CONFIGURATION=release builds the app and its helpers with optimization (default: debug).
# PODLIST_UI_PROFILE=1 records response-timing traces in guest-diagnostics (the profiler perturbs timings).
# PODLIST_UI_PROFILE_TEMPLATE selects the xctrace template by name (default: SwiftUI).
set -euo pipefail
mode=tour
if [ "${1:-}" = --system-checks ]; then mode=system; shift; fi
if [ "${1:-}" = --timings ]; then mode=timings; shift; fi
if [ "${1:-}" = --cross-client-sync ]; then mode=cross-sync; shift; fi
if [ "$#" -ne 1 ]; then echo "Usage: $0 [--system-checks | --timings | --cross-client-sync] <outdir>" >&2; exit 2; fi
if [ -z "${PODLIST_UI_VM:-}" ]; then
    echo "All UI tours require PODLIST_UI_VM (never run on the owner's desktop)" >&2
    exit 2
fi
styles="light dark borders-light borders-dark sidebar-light sidebar-dark"
if [ "$mode" = system ]; then styles=system; fi
if [ "$mode" = timings ]; then styles=light; fi
if [ "$mode" = cross-sync ]; then styles=cross-sync; fi
mkdir -p "$1"
out="$(cd "$1" && pwd)"
if [ -n "$(ls -A "$out")" ]; then echo "Output directory must be empty: $out" >&2; exit 2; fi
cd "$(dirname "$0")/.."
apple="$PWD"
repo="$(cd ../.. && pwd)"
run="$(mktemp -d /private/tmp/podlist-uitour.XXXXXX)"
run_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
demo_pid=""
test_pid=""
vm="${PODLIST_UI_VM:-}"
vm_clone=""
vm_pid=""
cleanup() {
    # No process-name matching: these PIDs belong to this invocation only.
    local cleanup_status=0
    if [ "$mode" = cross-sync ] && [ -n "$test_pid" ]; then
        kill -TERM "$test_pid" 2>/dev/null || true
        wait "$test_pid" 2>/dev/null || true
    fi
    if [ -n "$vm_clone" ]; then
        if ! tart stop "$vm_clone" >> "$out/vm.log" 2>&1 && [ -n "$vm_pid" ]; then
            kill -TERM "$vm_pid" 2>/dev/null || true
        fi
        if [ -n "$vm_pid" ]; then wait "$vm_pid" 2>/dev/null || true; fi
        tart delete "$vm_clone" >> "$out/vm.log" 2>&1 || cleanup_status=$?
    fi
    if [ "$mode" = cross-sync ]; then
        if [ -d "$run/cross-sync-results" ]; then
            mkdir -p "$out/mac"
            ditto "$run/cross-sync-results" "$out/mac" || true
        fi
        rm -rf "$run"
        if [ "$cleanup_status" -ne 0 ]; then
            echo "Tart could not delete $vm_clone; see $out/vm.log" >&2
            exit 1
        fi
        return
    fi
    # The app writes these directly to the share. Keep them on interruption
    # even if the guest never reached its normal result export.
    local report
    for report in "$run/guest-diagnostics"/main-thread-stall-*; do
        [ -f "$report" ] || continue
        mkdir -p "$out/guest-diagnostics"
        cp -f "$report" "$out/guest-diagnostics/" || true
    done
    if [ -n "$test_pid" ]; then kill -TERM "$test_pid" 2>/dev/null || true; wait "$test_pid" 2>/dev/null || true; fi
    if [ -n "$demo_pid" ]; then kill -TERM "$demo_pid" 2>/dev/null || true; wait "$demo_pid" 2>/dev/null || true; fi
    # XCTest normally terminates its app. If the runner was interrupted, identify
    # only our disposable executables by their full unique paths, then signal PIDs.
    python3 - "$run" $styles <<'PY'
import os, signal, subprocess, sys, time
from pathlib import Path
root = Path(sys.argv[1]).resolve()
owned = {str(root / style / 'PodList.app/Contents/MacOS/PodListMac') for style in sys.argv[2:]}
for line in subprocess.check_output(['ps', '-axo', 'pid=,comm='], text=True).splitlines():
    fields = line.strip().split(None, 1)
    if len(fields) != 2 or fields[1] not in owned:
        continue
    pid = int(fields[0])
    try:
        os.kill(pid, signal.SIGTERM)
        for _ in range(50):
            time.sleep(0.1)
            os.kill(pid, 0)
        os.kill(pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
PY
    for style in $styles; do
        identity="app.podlist.uitour.$run_id.$style"
        /usr/bin/defaults delete "$identity" >/dev/null 2>&1 || true
        # Delete only the fresh identities, never app.podlist.mac or shared PodList data.
        rm -rf "$HOME/Library/Caches/$identity" "$HOME/Library/HTTPStorages/$identity" "$HOME/Library/Saved Application State/$identity.savedState"
    done
    rm -rf "$run"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

PODLIST_UI_TOUR_BUILD=1 PODLIST_SYSTEM_INTEGRATION=0 "$apple/scripts/build-mac-app.sh" > "$out/build.log" 2>&1
# Stage only the executable on the host. The guest embeds it after setting the
# final bundle ID of each copy, so the extension always inherits that prefix.
if [ "$mode" != cross-sync ]; then
    cp -f "$apple/.build/${PODLIST_BUILD_CONFIGURATION:-debug}/PodListShare" "$run/PodListShare"
fi
for style in $styles; do
    mkdir -p "$run/$style/data"
    cp -Rf "$apple/.build/PodList.app" "$run/$style/PodList.app"
    /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier app.podlist.uitour.$run_id.$style" "$run/$style/PodList.app/Contents/Info.plist"
    codesign --force --sign - "$run/$style/PodList.app"
done

if [ "$mode" = system ]; then
    mkdir -p "$run/checks"
    cp -f "$apple/scripts/mcp-live-check.sh" "$apple/scripts/mcp-live-client.py" "$run/checks/"
    # Generate expectations from source, including the discoverable Now Playing intent.
    # Hidden snippet/control intents are deliberately excluded.
    python3 - "$apple/Sources/PodListMac" "$run/system/catalog.json" <<'PYCATALOG'
import json, re, sys
from pathlib import Path
source = Path(sys.argv[1])
intents = []
for file in (source / 'AppIntents.swift', source / 'NowPlayingSnippet.swift'):
    for body in re.findall(r'struct \w+: (?:AppIntent|UndoableIntent|SnippetIntent) \{(.*?)(?=\n(?:struct|enum|private struct)|\Z)', file.read_text(), re.S):
        title = re.search(r'static let title: LocalizedStringResource = "([^"]+)"', body)
        if title and 'static let isDiscoverable = false' not in body:
            intents.append(title[1])
shortcuts = re.findall(r'shortTitle: "([^"]+)"', (source / 'AppIntents.swift').read_text())
assert len(intents) == len(set(intents)) and intents and shortcuts
Path(sys.argv[2]).write_text(json.dumps({'intents': sorted(intents), 'shortcuts': sorted(shortcuts)}, indent=2) + '\n')
PYCATALOG
fi

# A tiny lifetime wrapper around the existing demo API, not a UI/capture tool.
# startDemo owns its server child PID, fixture listener and temporary database.
cat > "$run/demo.mjs" <<'JS'
import { pathToFileURL } from 'node:url'
import { writeFileSync } from 'node:fs'
const { startDemo } = await import(pathToFileURL(process.argv[2]))
let demo
let stopping = false
let requestedStop = false
async function stop() {
  requestedStop = true
  if (!demo || stopping) return
  stopping = true
  demo.stop()
  await demo.stopped
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void stop() })
demo = await startDemo({ largeSidebar: process.argv[4] === 'large-sidebar' })
if (requestedStop) await stop()
else writeFileSync(process.argv[3], demo.base)
JS

if [ -n "$vm" ]; then
    # Run inside a throwaway clone of a prepared macOS VM (ui-tour-vm-prepare.sh), so the
    # tour drives the VM's desktop, not this Mac's. This Mac builds; the guest runs the demo
    # server (from the repo, shared read-only) and the tests. No network path from this Mac
    # into the VM is needed; tart exec uses the VM's own channel.
    command -v tart >/dev/null || { echo "PODLIST_UI_VM needs tart" >&2; exit 2; }
    guest_run=/private/tmp/podlist-uitour-run
    # The guest's demo origin is only known once it starts; it replaces this placeholder.
    xcodebuild build-for-testing -project "$apple/PodListUITour.xcodeproj" -scheme PodListUITour \
        -destination "platform=macOS,arch=$(uname -m)" \
        -derivedDataPath "$apple/.build/ui-tour-derived" \
        "PODLIST_UI_RUN_DIRECTORY=$guest_run" "PODLIST_UI_SERVER_ORIGIN=http://127.0.0.1:1" \
        > "$out/xcodebuild.log" 2>&1
    mkdir "$run/products"
    cp -R "$apple/.build/ui-tour-derived/Build/Products/." "$run/products/"
    # One macOS VM at a time on this Mac (owner, 19 Nov 2026): wait while any Tart VM
    # runs, including other projects' tours such as FinderTools.
    while :; do
        running="$(tart list --format json | python3 -c 'import json, sys
print(" ".join(vm["Name"] for vm in json.load(sys.stdin) if vm.get("Running")))')"
        [ -n "$running" ] || break
        echo "Waiting for running VM(s) to finish: $running" >&2
        sleep 60
    done
    clone_name="podlist-ui-run-$run_id"
    tart clone "$vm" "$clone_name"
    vm_clone="$clone_name"
    developer="$(xcode-select -p)"
    tart run --no-graphics --no-audio --dir="run:$run" --dir="repo:$repo:ro" --dir="xcode:${developer%/Contents/Developer}:ro" "$vm_clone" > "$out/vm.log" 2>&1 &
    vm_pid=$!
    for ((attempt = 0; attempt < 300; attempt++)); do
        if tart exec "$vm_clone" true >/dev/null 2>&1; then break; fi
        if ! kill -0 "$vm_pid" 2>/dev/null; then cat "$out/vm.log" >&2; exit 1; fi
        sleep 1
    done
    tart exec "$vm_clone" true
    if [ "$mode" = cross-sync ]; then
        node "$repo/scripts/cross-client-sync/orchestrate.mjs" "$vm_clone" "$run" "$out" &
        test_pid=$!
        status=0
        wait "$test_pid" || status=$?
        test_pid=""
        exit "$status"
    fi
    # Opt-in: profile PodList during the response-timing runs (timings are then perturbed).
    if [ "${PODLIST_UI_PROFILE:-}" = 1 ]; then
        printf '%s\n' "${PODLIST_UI_PROFILE_TEMPLATE:-SwiftUI}" > "$run/profile"
    fi
    status=0
    tart exec "$vm_clone" /bin/bash "/Volumes/My Shared Files/repo/apps/apple/scripts/ui-tour-guest.sh" \
        "$guest_run" "$mode" >> "$out/xcodebuild.log" 2>&1 || status=$?
    if [ -f "$run/guest-demo.log" ]; then cp "$run/guest-demo.log" "$out/demo.log"; fi
    if [ -d "$run/guest-diagnostics" ]; then cp -R "$run/guest-diagnostics" "$out/"; fi
    for bundle in Tour ShowBorders Shortcuts MCP Integration; do
        if [ -d "$run/$bundle.xcresult" ]; then ditto "$run/$bundle.xcresult" "$out/$bundle.xcresult"; fi
    done
    if [ -d "$run/system-results" ]; then cp -R "$run/system-results" "$out/"; fi
fi

if [ "$mode" = system ]; then
    export_status=0
    for bundle in Shortcuts MCP Integration; do
        if [ -d "$out/$bundle.xcresult" ]; then
            xcrun xcresulttool export attachments --path "$out/$bundle.xcresult" \
                --output-path "$out/$bundle-attachments" || export_status=$?
        else
            export_status=1
        fi
    done
    python3 - "$out" "$status" "$export_status" <<'PYSUMMARY'
import json, sys
from pathlib import Path
out = Path(sys.argv[1])
summary = out / 'system-results/mcp-summary.json'
def attachment_names(bundle):
    manifest = out / (bundle + '-attachments/manifest.json')
    if not manifest.exists():
        return []
    return [item['suggestedHumanReadableName'] for test in json.loads(manifest.read_text()) for item in test['attachments']]
shortcuts_names = attachment_names('Shortcuts')
mcp_names = attachment_names('MCP')
integration_names = attachment_names('Integration')
evidence = any(name.startswith('shortcuts-actions') for name in shortcuts_names) and any(name.startswith('shortcuts-final') and name.endswith('.png') for name in shortcuts_names)
evidence = evidence and any(name.startswith('mcp-reopened') and name.endswith('.png') for name in mcp_names)
evidence = evidence and any(name.startswith('spotlight-query-results') for name in integration_names) and any(name.startswith('app-link-episode') and name.endswith('.png') for name in integration_names)
evidence = evidence and any(name.startswith('share-staged-address') and name.endswith('.png') for name in integration_names)
passed = sys.argv[2:] == ['0', '0'] and evidence and summary.exists() and json.loads(summary.read_text()).get('status') == 'passed'
(out / 'README.md').write_text('# PodList VM system checks\n\nStatus: ' + ('passed' if passed else 'incomplete') +
    '.\n\nShortcuts.xcresult: source-derived action discovery and optional App Shortcuts.\n'
    'Integration.xcresult: Spotlight fixture query, Episode app link, reopen, unavailable item and Safari Share handoff.\n'
    'MCP.xcresult: bundled stdio client, native Undo, last-window close, same-process reopen and Quit.\n'
    'Kept screenshots, trees and action names: Shortcuts-attachments/, Integration-attachments/ and MCP-attachments/.\n'
    'MCP transcript, summary and stderr: system-results/. Build/demo/test logs are retained.\n'
    'PlugInKit Share registration and election: system-results/share-registration.log.\n'
    'PodList unified log, including Share item loading and URL handoff: guest-diagnostics/podlist.log.\n'
    'Spotlight volume and daemon status, index and donation logs: guest-diagnostics/spotlight-status.txt and spotlight.log.\n'
    'A fresh throwaway Tart clone ran all UI; no host app was launched.\n')
if not passed:
    raise SystemExit('VM system checks incomplete; inspect xcresults, attachments and logs')
PYSUMMARY
    printf 'System checks exported to %s\n' "$out"
    exit 0
fi

if [ "$mode" = timings ]; then
    # Response timings only (Light). PODLIST_UI_PROFILE=1 adds an Instruments trace.
    xcrun xcresulttool export attachments --path "$out/Tour.xcresult" --output-path "$out/attachments"
    python3 - "$out" <<'PYTIMINGS'
import json, shutil, sys
from pathlib import Path
out = Path(sys.argv[1])
for test in json.loads((out / 'attachments/manifest.json').read_text()):
    for item in test['attachments']:
        if item['suggestedHumanReadableName'].startswith('light--timings'):
            shutil.copyfile(out / 'attachments' / item['exportedFileName'], out / 'timings.txt')
PYTIMINGS
    [ "$status" = 0 ] && [ -f "$out/timings.txt" ] || { echo "Timing run incomplete; see xcodebuild.log" >&2; exit 1; }
    cat "$out/timings.txt"
    exit 0
fi

# Export kept attachments even after a failed tour, for diagnosis in the main session.
export_status=0
for bundle in Tour ShowBorders; do
    attachments=attachments
    if [ "$bundle" = ShowBorders ]; then attachments=borders-attachments; fi
    if [ -d "$out/$bundle.xcresult" ]; then
        xcrun xcresulttool export attachments --path "$out/$bundle.xcresult" \
            --output-path "$out/$attachments" || export_status=$?
    else
        export_status=1
    fi
done
python3 - "$out" "$apple/UITour/PodListUITour.swift" "$status" "$export_status" <<'PY'
import json, re, shutil, sys
from pathlib import Path
out, source = map(Path, sys.argv[1:3])
screens = list(dict.fromkeys(re.findall(r'try capture\("([^"\n]+)"', source.read_text())))
assert len(screens) == 46, 'Tour screen catalog must have 46 distinct screens'
borders_screens = {'02-new-this-week', '03-episode-inspector', '13-new-playlist', '27-settings-general-top', '30-settings-automation'}
assert borders_screens <= set(screens), 'Show Borders screens must match baseline screen names'
expected = {f'{style}/{screen}.{ext}' for style in ('light', 'dark') for screen in screens for ext in ('png', 'txt')}
expected.update(f'{style}/{screen}.{ext}' for style in ('borders-light', 'borders-dark') for screen in borders_screens for ext in ('png', 'txt'))
expected.update({'menus.txt', 'light/timings.txt', 'dark/timings.txt'})
written = set()
for attachments in (out / 'attachments', out / 'borders-attachments'):
    manifest = attachments / 'manifest.json'
    if not manifest.exists():
        continue
    for test in json.loads(manifest.read_text()):
        for item in test['attachments']:
            name = item['suggestedHumanReadableName']
            match = re.search(r'((?:borders-)?(?:light|dark))--([0-9]{2}a?-[a-z0-9-]+?|timings)(?:_[0-9]+_[0-9A-F-]+)?\.(png|txt)$', name)
            destination = f'{match[1]}/{match[2]}.{match[3]}' if match else 'menus.txt' if name.startswith('menus') else None
            if destination not in expected:
                continue
            if destination in written:
                raise SystemExit(f'Duplicate tour attachment: {destination}')
            exported = attachments / item['exportedFileName']
            if exported.parent.resolve() != attachments.resolve():
                raise SystemExit('Unexpected exported attachment path')
            target = out / destination
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(exported, target)
            written.add(destination)
missing = sorted(expected - written)
complete = not missing and sys.argv[3:] == ['0', '0']
readme = '# PodList Mac XCUITest tour\n\n'
readme += f'Status: {"complete" if complete else "incomplete"}. {len(written)}/{len(expected)} required attachments exported.\n\n'
readme += 'Window screenshots include attached sheets. Text trees use public XCUI snapshots; role is XCUIElementType, and AX subrole and keyboard shortcuts are unavailable. Inspect NSMenuItem.keyEquivalent/keyEquivalentModifierMask in Xcode/LLDB for shortcuts. Apple and Services are excluded.\n\n'
readme += 'Each appearance starts with its own seeded demo server, disposable identity, data directory and defaults. An Episode remains paused throughout. The test app quits at teardown and its files are removed. No owner Library is used.\n\n'
readme += 'The focused APPEAR-03 pass runs with macOS Show Borders on. Test results: Tour.xcresult and ShowBorders.xcresult. Logs: build.log, demo.log, xcodebuild.log. Raw exports: attachments/ and borders-attachments/. UI execution is confined to the throwaway VM desktop.\n\n'
readme += 'Screens 37–39 use Window → Move & Resize → Left to tile the Library to half the display. Screen 39 keeps scoped Playlist Search in the toolbar.\n\n'
readme += 'Screens 40–42 show a sidebar with 30 Views and 30 Playlists, using a separate demo Library: top, bottom, and Playlists folded.\n\n'
readme += 'Screen 11a shows deleted Playlist Settings with Restore Playlist and Close. A click, Return, and Escape preserve the draft through Trash Restore. Screen 32 shows the Getting Started window. Screen 34a shows the selected Timeline row with Rewind. Screen 43 shows the Inspector explicitly opened at minimum width. Screen 44 shows a delayed Entry Undo after completion, with the typed Search, retained selection, and Show Restored Entries action, also available in Edit.\n\n'
readme += 'Response timings are in light/timings.txt and dark/timings.txt. The app measures them in the VM, from the input event to the first display frame that can show the result. RESP-01 sets a 200 ms limit at the 75th percentile. The tour records timings without enforcing the limit. The tour does not measure RESP-02 keystroke and drag frame timing.\n\n'
readme += '| Screen | Light / Dark files | Show Borders Light / Dark files |\n|---|---|---|\n'
for screen in screens:
    borders = f'borders-light/{screen}.png + .txt; borders-dark/{screen}.png + .txt' if screen in borders_screens else ''
    readme += f'| {screen} | light/{screen}.png + .txt; dark/{screen}.png + .txt | {borders} |\n'
if missing:
    readme += '\nMissing attachments:\n\n' + '\n'.join(f'- {name}' for name in missing) + '\n'
(out / 'README.md').write_text(readme)
if not complete:
    raise SystemExit('UI tour incomplete; see README.md and xcodebuild.log')
PY
if [ "$status" -ne 0 ]; then exit "$status"; fi
if [ "$export_status" -ne 0 ]; then exit "$export_status"; fi
printf 'Tour exported to %s\n' "$out"
