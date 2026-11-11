#!/bin/bash
# Build a local development bundle. Never installs or registers it.
set -euo pipefail
cd "$(dirname "$0")/.."
export CLANG_MODULE_CACHE_PATH="$PWD/.build/module-cache"
export SWIFTPM_MODULECACHE_OVERRIDE="$PWD/.build/module-cache"
swift build --scratch-path .build --disable-sandbox --product PodListMac
bin_dir="$(swift build --scratch-path .build --disable-sandbox --show-bin-path)"
app="$PWD/.build/PodList.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources" .build/app-intents
cp -f "$bin_dir/PodListMac" "$app/Contents/MacOS/PodListMac"
cat > "$app/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>app.podlist.mac</string>
<key>CFBundleName</key><string>PodList</string>
<key>CFBundleDisplayName</key><string>PodList</string>
<key>CFBundleExecutable</key><string>PodListMac</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.1.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSMinimumSystemVersion</key><string>26.0</string>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
# SwiftPM emits compiler constant values on the Xcode build engine, but does not
# run the app metadata packaging phase. Collect only this executable's values.
python3 - <<'PY'
from pathlib import Path
import platform
root = Path.cwd()
files = sorted((root / 'Sources/PodListMac').glob('*.swift'))
const = sorted(p for p in (root / '.build').glob('**/PodListMac*.build/**/*.swiftconstvalues')
               if '/Debug/' in str(p) and p.parent.name == platform.machine())
if not const:
    raise SystemExit('No App Intents compiler metadata found. Use the Xcode SwiftPM build engine (Swift 6.4+).')
(root / '.build/app-intents/sources').write_text(''.join(str(p) + '\n' for p in files))
(root / '.build/app-intents/constants').write_text(''.join(str(p) + '\n' for p in const))
PY
sdk="$(xcrun --sdk macosx --show-sdk-path)"
toolchain="$(dirname "$(dirname "$(xcrun --find swiftc)")")"
xcode_version="$(xcodebuild -version | awk '/Build version/ { print $3 }')"
triple="$(swift -print-target-info | python3 -c 'import json,sys; print(json.load(sys.stdin)["target"]["triple"])')"
rm -rf "$app/Contents/Resources/Metadata.appintents"
xcrun appintentsmetadataprocessor \
    --output "$app/Contents/Resources" \
    --toolchain-dir "$toolchain" --module-name PodListMac \
    --sdk-root "$sdk" --xcode-version "$xcode_version" \
    --platform-family macOS --deployment-target 26.0 --target-triple "$triple" \
    --source-file-list "$PWD/.build/app-intents/sources" \
    --swift-const-vals-list "$PWD/.build/app-intents/constants"
python3 - "$app/Contents/Resources/Metadata.appintents/extract.actionsdata" <<'PYMETA'
import json, sys
with open(sys.argv[1]) as file:
    metadata = json.load(file)
if not metadata.get('actions') or not metadata.get('entities') or not metadata.get('autoShortcuts'):
    raise SystemExit('App Intents extraction did not produce actions, entities and shortcuts.')
print(f"Extracted {len(metadata['actions'])} intents, {len(metadata['entities'])} entities, {len(metadata['autoShortcuts'])} shortcuts")
PYMETA
codesign --force --sign - "$app"
printf 'Built %s\n' "$app"
