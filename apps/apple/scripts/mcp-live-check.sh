#!/bin/bash
# Guest entry point. XCUITest launches the isolated app and drives native Undo/windows;
# --client is its internal, concurrent stdio client (no UI automation in Python).
set -euo pipefail
scripts="$(cd "$(dirname "$0")" && pwd)"
if [ "${1:-}" = --client ]; then
    [ "$#" -eq 2 ] || { echo "Usage: $0 --client <guest-run-directory>" >&2; exit 2; }
    exec python3 "$scripts/mcp-live-client.py" "$2"
fi
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
exec xcodebuild test-without-building -xctestrun "$run/products/MCP.xctestrun" \
    -destination 'platform=macOS' -parallel-testing-enabled NO \
    -only-testing:PodListUITour/PodListSystemChecks/testMCPWindowLifecycle \
    -test-timeouts-enabled YES -default-test-execution-time-allowance 600 \
    -maximum-test-execution-time-allowance 900 -resultBundlePath "$run/MCP.xcresult"
