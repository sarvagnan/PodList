#!/bin/bash
# Embed and sign the Share extension after assigning the containing app's final identity.
# The caller signs the containing app afterwards.
set -euo pipefail
scripts="$(cd "$(dirname "$0")" && pwd)"
app="$1"
binary="$2"
plist_buddy=/usr/libexec/PlistBuddy
extension="$app/Contents/PlugIns/PodListShare.appex"
info="$extension/Contents/Info.plist"
mkdir -p "$extension/Contents/MacOS"
cp -f "$binary" "$extension/Contents/MacOS/PodListShare"
cp -f "$scripts/share-extension-info.plist" "$info"
host_info="$app/Contents/Info.plist"
host_id="$("$plist_buddy" -c 'Print :CFBundleIdentifier' "$host_info")"
"$plist_buddy" -c "Add :CFBundleIdentifier string $host_id.share" "$info"
for key in CFBundleVersion CFBundleShortVersionString; do
    "$plist_buddy" -c "Add :$key string $("$plist_buddy" -c "Print :$key" "$host_info")" "$info"
done
codesign --force --sign - --entitlements "$scripts/share-extension.entitlements" "$extension"
