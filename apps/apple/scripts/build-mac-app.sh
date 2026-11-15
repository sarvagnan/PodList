#!/bin/bash
# Build a local development bundle. Never installs or registers it.
set -euo pipefail
cd "$(dirname "$0")/.."
export CLANG_MODULE_CACHE_PATH="$PWD/.build/module-cache"
export SWIFTPM_MODULECACHE_OVERRIDE="$PWD/.build/module-cache"
swift build --scratch-path .build --disable-sandbox --product PodListMac
swift build --scratch-path .build --disable-sandbox --product podlist-mcp
bin_dir="$(swift build --scratch-path .build --disable-sandbox --show-bin-path)"
app="$PWD/.build/PodList.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources" .build/app-intents
cp -f "$bin_dir/PodListMac" "$app/Contents/MacOS/PodListMac"
cp -f "$bin_dir/podlist-mcp" "$app/Contents/MacOS/podlist-mcp"
# SwiftPM resource bundles (Bundle.module looks in Contents/Resources). Without them the
# first edit traps when protocol validation loads its schema.
for bundle in "$bin_dir"/*.bundle; do
    rm -rf "$app/Contents/Resources/$(basename "$bundle")"
    cp -R "$bundle" "$app/Contents/Resources/"
done
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
<key>NSAccentColorName</key><string>AccentColor</string>
<key>UTExportedTypeDeclarations</key><array><dict>
<key>UTTypeIdentifier</key><string>app.podlist.episode</string>
<key>UTTypeDescription</key><string>PodList Episode</string>
<key>UTTypeConformsTo</key><array><string>public.data</string></array>
</dict></array>
</dict></plist>
PLIST
# SwiftPM builds executables and module resources, not the main app's asset
# catalogue. Compile the global accent into the main bundle before signing.
# NSAccentColorName lets macOS use it for Multicolor and honor other system accents.
xcrun actool "$PWD/Resources/MacAssets.xcassets" \
    --compile "$app/Contents/Resources" \
    --platform macosx --minimum-deployment-target 26.0 \
    --target-device mac --accent-color AccentColor \
    --output-partial-info-plist "$PWD/.build/accent-info.plist"
[ -s "$app/Contents/Resources/Assets.car" ] || { echo "Missing compiled accent catalogue" >&2; exit 1; }
# Verify the packaged catalogue, not just the source JSON or an old Assets.car.
xcrun assetutil --info "$app/Contents/Resources/Assets.car" > "$PWD/.build/accent-assets.json"
python3 - "$PWD/.build/accent-assets.json" <<'PYACCENT'
import json, sys
with open(sys.argv[1]) as file:
    colors = [entry for entry in json.load(file) if entry.get('Name') == 'AccentColor']
expected = {
    'NSAppearanceNameSystem': (43, 80, 200, 255),
    'NSAppearanceNameDarkAqua': (157, 177, 255, 255),
    'NSAppearanceNameAccessibilitySystem': (25, 58, 155, 255),
    'NSAppearanceNameAccessibilityDarkAqua': (178, 193, 255, 255),
}
actual = {entry.get('Appearance', 'NSAppearanceNameSystem'):
          tuple(round(value * 255) for value in entry.get('Color components', []))
          for entry in colors if entry.get('Colorspace') == 'srgb'}
if len(colors) != 4 or actual != expected:
    raise SystemExit(f'Compiled AccentColor variants do not match the brand palette: {actual}')
print('Verified four compiled AccentColor variants in the app bundle')
PYACCENT
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
for bundle in "$bin_dir"/*.bundle; do
    [ -d "$app/Contents/Resources/$(basename "$bundle")" ] || { echo "Missing $(basename "$bundle") in the app" >&2; exit 1; }
done
codesign --force --sign - "$app"
printf 'Built %s\n' "$app"
