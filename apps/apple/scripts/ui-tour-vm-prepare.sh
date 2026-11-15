#!/bin/bash
# One-time setup of the macOS VM that runs the XCUITest tour (ui-tour.sh with PODLIST_UI_VM).
#
#   tart clone ghcr.io/cirruslabs/macos-golden-gate-base:latest podlist-base
#   apps/apple/scripts/ui-tour-vm-prepare.sh [base-vm] [new-vm]
#
# Copies this Mac's Xcode into a clone of the base image, accepts its licence, and lets
# UI tests enable Automation Mode without a password. That is safe only because the VM is
# a throwaway test machine; never run the automationmodetool step on a real Mac.
# Cirrus Labs images use the documented default account admin/admin.
set -euo pipefail
base="${1:-podlist-base}"
vm="${2:-podlist-ui}"
developer="$(xcode-select -p)"
xcode="${developer%/Contents/Developer}"
[ -d "$xcode/Contents/Developer" ] || { echo "Xcode not found at $xcode" >&2; exit 1; }

tart clone "$base" "$vm"
# 1180x760 pt windows fit comfortably; pt makes the guest display HiDPI (2x), like a Retina Mac.
tart set "$vm" --cpu 4 --memory 8192 --display 1440x900pt
tart run --no-graphics --dir="xcode:$xcode:ro" "$vm" > /dev/null 2>&1 &
vm_pid=$!
trap 'tart stop "$vm" > /dev/null 2>&1 || true; wait "$vm_pid" 2> /dev/null || true' EXIT
for ((i = 0; i < 300; i++)); do
    if tart exec "$vm" true > /dev/null 2>&1; then break; fi
    sleep 1
done
tart exec "$vm" true

tart exec "$vm" /bin/bash -c '
set -euo pipefail
s() { echo admin | sudo -S -p "" "$@"; }
s ditto "/Volumes/My Shared Files/xcode" /Applications/Xcode.app
s xcode-select -s /Applications/Xcode.app
s xcodebuild -license accept
s xcodebuild -runFirstLaunch
s DevToolsSecurity -enable
s automationmodetool enable-automationmode-without-authentication
xcodebuild -version
automationmodetool
'
echo "Prepared VM $vm. Run the tour with: PODLIST_UI_VM=$vm apps/apple/scripts/ui-tour.sh <outdir>"
