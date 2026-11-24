#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${PODLIST_SYNC_PORT:?Set the same port you passed to boat forward --reverse --local}"
: "${BOAT_SANDBOX:?Set the ID of the disposable Boat sandbox}"
[[ "$PODLIST_SYNC_PORT" =~ ^[1-9][0-9]{3,4}$ ]] && [ "$PODLIST_SYNC_PORT" -ge 1024 ] && [ "$PODLIST_SYNC_PORT" -le 65535 ] || {
    echo 'PODLIST_SYNC_PORT must be an unprivileged TCP port' >&2; exit 2;
}
[[ "$BOAT_SANDBOX" =~ ^bx_[a-zA-Z0-9]+$ ]] || { echo 'Invalid BOAT_SANDBOX' >&2; exit 2; }
export PODLIST_UI_VM="${PODLIST_UI_VM:-podlist-ui}"
export PODLIST_SYNC_APP_APK="${PODLIST_SYNC_APP_APK:-$PWD/apps/android/app/build/outputs/apk/debug/app-debug.apk}"
export PODLIST_SYNC_TEST_APK="${PODLIST_SYNC_TEST_APK:-$PWD/apps/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk}"
for apk in "$PODLIST_SYNC_APP_APK" "$PODLIST_SYNC_TEST_APK"; do
    [ -s "$apk" ] || { echo "Missing built APK: $apk" >&2; exit 2; }
done
for tool in node pnpm tart boat; do command -v "$tool" >/dev/null || exit 2; done
out="$PWD/podlist-grading/cross-client-sync/$(date -u +%Y%m%d-%H%M%S)-$$"
mkdir -p "$out"
node scripts/cross-client-sync/orchestrate.mjs --initialize-report "$out"
printf 'Artifacts: %s\n' "$out"
pnpm --filter @podlist/web build > "$out/web-build.log" 2>&1
# ui-tour.sh requires an empty destination and owns the clone and shared staging directory.
exec apps/apple/scripts/ui-tour.sh --cross-client-sync "$out/tart"
