#!/bin/bash
# Internal entry point. Only ui-tour.sh stages the disposable guest/test share.
set -euo pipefail
run=/private/tmp/podlist-uitour-run
share='/Volumes/My Shared Files/run'
scripts='/Volumes/My Shared Files/repo/scripts/cross-client-sync'
control="$share/cross-sync-control"
results="$share/cross-sync-results"
case "${1:-}" in
    start)
        [ "$#" -eq 3 ] && [ -d "$share/cross-sync" ] && [ -d "$control" ] || exit 2
        rm -rf "$run"
        mkdir -p "$run" "$results"
        touch "$run/uitour-vm"
        ditto "$share/cross-sync" "$run/cross-sync"
        ditto "$share/products" "$run/products"
        printf 'http://127.0.0.1:%s' "$3" > "$run/cross-sync/origin"
        export PODLIST_TEST_DEMO_NOW="$(node -e 'console.log(Date.now())')"
        exec node "$scripts/guest-demo.mjs" "$2" "$3" "$control"
        ;;
    test)
        [ "$#" -eq 2 ] && [ -f "$run/uitour-vm" ] && [[ "$2" =~ ^[a-z-]+$ ]] || exit 2
        phase="$2"
        printf '%s' "$phase" > "$run/cross-sync/phase"
        cd "$run/products"
        xctestruns=(*.xctestrun)
        [ "${#xctestruns[@]}" -eq 1 ] && [ -f "${xctestruns[0]}" ] || exit 1
        bundle="$run/$phase.xcresult"
        status=0
        xcodebuild test-without-building -xctestrun "${xctestruns[0]}" \
            -destination 'platform=macOS' -parallel-testing-enabled NO \
            -only-testing:PodListUITour/PodListUITour/testCrossClientSync \
            -test-timeouts-enabled YES -default-test-execution-time-allowance 480 \
            -maximum-test-execution-time-allowance 540 -resultBundlePath "$bundle" || status=$?
        if [ -d "$bundle" ]; then
            ditto "$bundle" "$results/$phase.xcresult"
            if [ "$status" -ne 0 ]; then
                xcrun xcresulttool export attachments --path "$bundle" --output-path "$run/$phase-attachments" &&
                    ditto "$run/$phase-attachments" "$results/$phase-attachments" || true
            fi
        fi
        exit "$status"
        ;;
    *) exit 2 ;;
esac
