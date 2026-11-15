#!/bin/bash
# Guest entry point. XCUITest drives native Undo/windows; this unsandboxed guest
# process launches the concurrent stdio client after the runner publishes its temp path.
set -euo pipefail
scripts="$(cd "$(dirname "$0")" && pwd)"
[ "$#" -eq 1 ] || { echo "Usage (inside the test VM): $0 <guest-run-directory>" >&2; exit 2; }
run="$(cd "$1" && pwd)"
[ -f "$run/system-vm" ] || { echo "Refusing to run outside a disposable system-check VM" >&2; exit 2; }
# Patch a private xctestrun copy, preserving the guest's demo origin and test product paths.
python3 - "$run" <<'PY'
import plistlib, sys
from pathlib import Path
run = Path(sys.argv[1])
files = [p for p in (run / 'products').glob('*.xctestrun') if p.name != 'MCP.xctestrun']
if len(files) != 1:
    raise SystemExit('Expected exactly one built xctestrun in products/')
with files[0].open('rb') as f:
    plan = plistlib.load(f)
plan['PodListUITour']['EnvironmentVariables']['PODLIST_UI_RUN_DIRECTORY'] = str(run)
with (run / 'products/MCP.xctestrun').open('wb') as f:
    plistlib.dump(plan, f)
PY
test_pid=""
client_pid=""
finish() {
    for pid in "$client_pid" "$test_pid"; do
        if [ -n "$pid" ]; then kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; fi
    done
    cat "$run/system/mcp-xcodebuild.log"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
xcodebuild test-without-building -xctestrun "$run/products/MCP.xctestrun" \
    -destination 'platform=macOS' -parallel-testing-enabled NO \
    -only-testing:PodListUITour/PodListSystemChecks/testMCPWindowLifecycle \
    -test-timeouts-enabled YES -default-test-execution-time-allowance 600 \
    -maximum-test-execution-time-allowance 900 -resultBundlePath "$run/MCP.xcresult" \
    > "$run/system/mcp-xcodebuild.log" 2>&1 &
test_pid=$!
exchange=""
for ((attempt = 0; attempt < 1800; attempt++)); do
    exchange="$(sed -n 's/^PODLIST_MCP_EXCHANGE=//p' "$run/system/mcp-xcodebuild.log" | head -n 1)"
    [ -z "$exchange" ] || break
    kill -0 "$test_pid" 2>/dev/null || break
    sleep 0.1
done
[ -n "$exchange" ] || { echo 'XCTest did not publish its MCP exchange directory' >&2; exit 1; }
# Require a fresh, owned temporary directory created by XCTest. Foundation can use
# Darwin's per-user temp directory even when tart exec leaves TMPDIR unset.
python3 - "$exchange" <<'PYEXCHANGE'
import os, sys, tempfile, uuid
from pathlib import Path
path = Path(sys.argv[1]).resolve(strict=True)
temporary = Path(tempfile.gettempdir()).resolve()
containers = Path.home() / 'Library/Containers'
in_darwin_temporary = str(path).startswith('/private/var/folders/') and any(p.name == 'T' for p in path.parents)
in_temporary = path.is_relative_to(temporary) or in_darwin_temporary
in_container = path.is_relative_to(containers) and path.parent.parts[-2:] == ('Data', 'tmp')
if not (path.name.startswith('podlist-mcp-') and (in_temporary or in_container)
        and path.is_dir() and path.stat().st_uid == os.getuid()):
    raise SystemExit('Refusing non-runner temporary exchange directory')
uuid.UUID(path.name.removeprefix('podlist-mcp-'))
PYEXCHANGE
python3 "$scripts/mcp-live-client.py" "$run" "$exchange" > "$run/system/mcp-client.log" 2>&1 &
client_pid=$!
status=0
wait "$test_pid" || status=$?
test_pid=""
# On a UI assertion failure, the client can still be waiting at a checkpoint.
if [ "$status" -ne 0 ]; then exit "$status"; fi
wait "$client_pid" || status=$?
client_pid=""
exit "$status"
