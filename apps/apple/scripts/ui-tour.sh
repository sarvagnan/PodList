#!/bin/bash
# Run from a logged-in Mac desktop. XCUITest brings PodList forward and drives input.
set -euo pipefail
if [ "$#" -ne 1 ]; then echo "Usage: $0 <outdir>" >&2; exit 2; fi
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
    if [ -n "$vm_clone" ]; then
        tart stop "$vm_clone" >/dev/null 2>&1 || true
        if [ -n "$vm_pid" ]; then wait "$vm_pid" 2>/dev/null || true; fi
        tart delete "$vm_clone" >/dev/null 2>&1 || true
    fi
    if [ -n "$test_pid" ]; then kill -TERM "$test_pid" 2>/dev/null || true; wait "$test_pid" 2>/dev/null || true; fi
    if [ -n "$demo_pid" ]; then kill -TERM "$demo_pid" 2>/dev/null || true; wait "$demo_pid" 2>/dev/null || true; fi
    # XCTest normally terminates its app. If the runner was interrupted, identify
    # only our disposable executables by their full unique paths, then signal PIDs.
    python3 - "$run" <<'PY'
import os, signal, subprocess, sys, time
from pathlib import Path
root = Path(sys.argv[1]).resolve()
owned = {str(root / style / 'PodList.app/Contents/MacOS/PodListMac') for style in ('light', 'dark')}
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
    for style in light dark; do
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

"$apple/scripts/build-mac-app.sh" > "$out/build.log" 2>&1
for style in light dark; do
    mkdir -p "$run/$style/data"
    cp -Rf "$apple/.build/PodList.app" "$run/$style/PodList.app"
    /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier app.podlist.uitour.$run_id.$style" "$run/$style/PodList.app/Contents/Info.plist"
    codesign --force --sign - "$run/$style/PodList.app"
done

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
demo = await startDemo()
if (requestedStop) await stop()
else writeFileSync(process.argv[3], demo.base)
JS
if [ -z "$vm" ]; then
PODLIST_TEST_DEMO_NOW="$(node -e 'console.log(Date.now())')" \
    node "$run/demo.mjs" "$repo/packages/web/ui-flows/demo.mjs" "$run/origin" > "$out/demo.log" 2>&1 &
demo_pid=$!
for ((attempt = 0; attempt < 300; attempt++)); do
    if [ -s "$run/origin" ]; then break; fi
    if ! kill -0 "$demo_pid" 2>/dev/null; then cat "$out/demo.log" >&2; exit 1; fi
    sleep 0.1
done
if [ ! -s "$run/origin" ]; then echo "Demo startup timed out; see demo.log" >&2; exit 1; fi
origin="$(cat "$run/origin")"
fi

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
    vm_clone="podlist-ui-run-$run_id"
    tart clone "$vm" "$vm_clone"
    developer="$(xcode-select -p)"
    tart run --no-graphics --dir="run:$run" --dir="repo:$repo:ro" --dir="xcode:${developer%/Contents/Developer}:ro" "$vm_clone" > "$out/vm.log" 2>&1 &
    vm_pid=$!
    for ((attempt = 0; attempt < 300; attempt++)); do
        if tart exec "$vm_clone" true >/dev/null 2>&1; then break; fi
        if ! kill -0 "$vm_pid" 2>/dev/null; then cat "$out/vm.log" >&2; exit 1; fi
        sleep 1
    done
    tart exec "$vm_clone" true
    status=0
    tart exec "$vm_clone" /bin/bash -c "
        set -u
        shared='/Volumes/My Shared Files'
        rm -rf '$guest_run' && mkdir -p '$guest_run'
        for item in light dark products; do ditto \"\$shared/run/\$item\" '$guest_run'/\$item; done
        PODLIST_TEST_DEMO_NOW=\$(node -e 'console.log(Date.now())') node \"\$shared/run/demo.mjs\" \\
            \"\$shared/repo/packages/web/ui-flows/demo.mjs\" '$guest_run/origin' > '$guest_run/demo.log' 2>&1 &
        demo=\$!
        for i in \$(seq 1 600); do [ -s '$guest_run/origin' ] && break; sleep 0.1; done
        if [ ! -s '$guest_run/origin' ]; then cat '$guest_run/demo.log'; kill \$demo; exit 1; fi
        cd '$guest_run/products'
        xctestrun=\$(ls *.xctestrun | head -1)
        /usr/libexec/PlistBuddy -c \"Set :PodListUITour:EnvironmentVariables:PODLIST_UI_SERVER_ORIGIN \$(cat '$guest_run/origin')\" \"\$xctestrun\"
        xcodebuild test-without-building -xctestrun \"\$xctestrun\" \\
            -destination 'platform=macOS' -parallel-testing-enabled NO \\
            -resultBundlePath '$guest_run/Tour.xcresult'
        result=\$?
        kill \$demo 2>/dev/null; wait \$demo 2>/dev/null
        cp '$guest_run/demo.log' \"\$shared/run/guest-demo.log\"
        if [ -d '$guest_run/Tour.xcresult' ]; then ditto '$guest_run/Tour.xcresult' \"\$shared/run/Tour.xcresult\"; fi
        exit \$result
    " >> "$out/xcodebuild.log" 2>&1 || status=$?
    if [ -f "$run/guest-demo.log" ]; then cp "$run/guest-demo.log" "$out/demo.log"; fi
    if [ -d "$run/Tour.xcresult" ]; then ditto "$run/Tour.xcresult" "$out/Tour.xcresult"; fi
else
# Serial tests share the foreground desktop. Build settings expand in the shared scheme.
xcodebuild test -project "$apple/PodListUITour.xcodeproj" -scheme PodListUITour \
    -destination "platform=macOS,arch=$(uname -m)" -parallel-testing-enabled NO \
    -derivedDataPath "$apple/.build/ui-tour-derived" \
    -resultBundlePath "$out/Tour.xcresult" \
    "PODLIST_UI_RUN_DIRECTORY=$run" "PODLIST_UI_SERVER_ORIGIN=$origin" \
    > "$out/xcodebuild.log" 2>&1 &
test_pid=$!
status=0
wait "$test_pid" || status=$?
test_pid=""
fi

# Export kept attachments even after a failed tour, for diagnosis in the main session.
export_status=0
if [ -d "$out/Tour.xcresult" ]; then
    xcrun xcresulttool export attachments --path "$out/Tour.xcresult" \
        --output-path "$out/attachments" || export_status=$?
else
    export_status=1
fi
python3 - "$out" "$apple/UITour/PodListUITour.swift" "$status" "$export_status" <<'PY'
import json, re, shutil, sys
from pathlib import Path
out, source = map(Path, sys.argv[1:3])
screens = re.findall(r'try capture\("([^"\n]+)"', source.read_text())
assert len(screens) == 35 and len(set(screens)) == 35, 'Tour screen catalog must be unique'
expected = {f'{style}/{screen}.{ext}' for style in ('light', 'dark') for screen in screens for ext in ('png', 'txt')}
expected.add('menus.txt')
manifest = out / 'attachments/manifest.json'
written = set()
if manifest.exists():
    for test in json.loads(manifest.read_text()):
        for item in test['attachments']:
            name = item['suggestedHumanReadableName']
            match = re.search(r'(light|dark)--([0-9]{2}a?-[a-z0-9-]+)\.(png|txt)', name)
            destination = f'{match[1]}/{match[2]}.{match[3]}' if match else 'menus.txt' if name.startswith('menus.txt') else None
            if destination not in expected:
                continue
            if destination in written:
                raise SystemExit(f'Duplicate tour attachment: {destination}')
            exported = out / 'attachments' / item['exportedFileName']
            if exported.parent.resolve() != (out / 'attachments').resolve():
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
readme += 'Each appearance starts with its own disposable identity, data directory and defaults. An Episode remains paused throughout. The test app quits at teardown and its files are removed. No owner Library is used.\n\n'
readme += 'Full test results: Tour.xcresult. Logs: build.log, demo.log, xcodebuild.log. Raw exports: attachments/. UI execution requires the logged-in foreground desktop.\n\n'
readme += '| Screen | Light / Dark files |\n|---|---|\n'
for screen in screens:
    readme += f'| {screen} | light/{screen}.png + .txt; dark/{screen}.png + .txt |\n'
if missing:
    readme += '\nMissing attachments:\n\n' + '\n'.join(f'- {name}' for name in missing) + '\n'
(out / 'README.md').write_text(readme)
if not complete:
    raise SystemExit('UI tour incomplete; see README.md and xcodebuild.log')
PY
if [ "$status" -ne 0 ]; then exit "$status"; fi
if [ "$export_status" -ne 0 ]; then exit "$export_status"; fi
printf 'Tour exported to %s\n' "$out"
