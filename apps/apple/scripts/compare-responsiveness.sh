#!/bin/bash
# Run the two timing modes in alternating fresh clones of the same base VM.
set -euo pipefail
if [ "$#" -ne 1 ] || [[ ! "$1" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]*$ ]]; then
    echo "Usage: $0 <run-name>" >&2
    exit 2
fi
scripts="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$scripts/../../.." && pwd)"
root="$repo/podlist-grading/responsiveness"
out="$root/$1"
mkdir -p "$root"
mkdir "$out"
export PODLIST_UI_VM="${PODLIST_UI_VM:-podlist-ui}"
export PODLIST_BUILD_CONFIGURATION="${PODLIST_BUILD_CONFIGURATION:-release}"
export PODLIST_UI_PROFILE=0

for iteration in 1 2; do
    "$scripts/ui-tour.sh" --timings "$out/native-$iteration"
    "$scripts/ui-tour.sh" --electron-timings "$out/electron-$iteration"
done

python3 - "$out" <<'PY'
import re
import sys
from pathlib import Path

out = Path(sys.argv[1])
runs = ('native-1', 'electron-1', 'native-2', 'electron-2')
reports = {
    run: {
        label: (coverage, p75)
        for label, coverage, p75 in re.findall(
            r'^(.+): samples=(\d+/\d+), (?:p75=(\d+\.\d+) ms, max=\d+\.\d+ ms|unobserved \(short sample count\))$',
            (out / run / 'timings.txt').read_text(),
            re.MULTILINE,
        )
    }
    for run in runs
}
actions = (
    ('Open New this week', 'Sidebar → New this week Episode list', 'Sidebar → New this week Episode list'),
    ('Select Episode (pane opens)', 'Select Episode → Episode Inspector (pane opens)', 'Select Episode → Episode Inspector (pane opens)'),
    ('Select Episode (pane stays open)', 'Select Episode → Episode Inspector (pane stays open)', 'Select Episode → Episode Inspector (pane stays open)'),
    ('Open New Playlist', 'Shift-Cmd-N → New Playlist sheet', 'New Playlist button → dialog'),
    ('Open Settings', 'Cmd-, → Settings window', 'Settings sidebar link → Settings page'),
    ('Filter Episodes with the final e in rice', 'Final e in rice → filtered Episode list', 'Final e in rice → filtered Episode list'),
)

def cell(run, action):
    if action is None:
        return '—'
    if action not in reports[run]:
        raise SystemExit(f'{out / run / "timings.txt"} is missing {action}')
    coverage, p75 = reports[run][action]
    return p75 or f'unobserved ({coverage})'

headings = [f'[{run.replace("-", " ").title()}]({run}/timings.txt)' for run in runs]
lines = [
    '# PodList responsiveness in the Tart VM',
    '',
    'Each value is p75 in milliseconds, from five samples after three warm-ups.',
    '',
    '| Action | ' + ' | '.join(headings) + ' |',
    '| --- | ---: | ---: | ---: | ---: |',
]
for title, native, electron in actions:
    values = [cell(run, native if run.startswith('native') else electron) for run in runs]
    lines.append('| ' + ' | '.join([title, *values]) + ' |')
lines += [
    '',
    'Both apps measure the first selection with the Inspector hidden, then a different selection while it is open. Electron uses Enter on the New Playlist and Settings sidebar controls and the separate Library Search page with its query debounce.',
    'The native endpoint is the display-link target time. The Electron endpoint is a pre-paint animation frame timestamp after the committed result becomes visible.',
    '',
]
memory_headings = [f'[{run.replace("-", " ").title()}]({run}/memory.txt)'
                   if (out / run / 'memory.txt').exists() else run for run in runs]
memory = {}
for run in runs:
    report = out / run / 'memory.txt'
    memory[run] = dict(re.findall(
        r'^(Launch settled|Timing median|Timing peak|Complete timing samples): (.+)$',
        report.read_text() if report.exists() else '',
        re.MULTILINE,
    ))
lines += [
    '## Memory',
    '',
    'Guest-side samples use macOS libproc physical footprint and RSS. The launch sample is taken once the app is ready after the guest settles. Median and peak use complete samples taken about every two seconds during the loop, including warm-ups.',
    '',
    '| Measurement | ' + ' | '.join(memory_headings) + ' |',
    '| --- | ---: | ---: | ---: | ---: |',
]
for measure in ('Launch settled', 'Timing median', 'Timing peak', 'Complete timing samples'):
    values = [memory[run].get(measure, 'unobserved') for run in runs]
    lines.append('| ' + ' | '.join([measure, *values]) + ' |')
lines += [
    '',
    'Each pass links to the per-process breakdown. Totals sum the app-owned processes. RSS can count shared pages more than once.',
    'Native runs with accessibility active for XCUITest. Electron runs with a DevTools automation connection. Both may inflate memory. The sampler excludes the test and automation drivers.',
    '',
]
(out / 'comparison.md').write_text('\n'.join(lines))
incomplete = [run for run in runs if any(
    memory[run].get(measure, 'unobserved') == 'unobserved'
    for measure in ('Launch settled', 'Timing median', 'Timing peak')
)]
if incomplete:
    raise SystemExit(f'Incomplete memory readings for {", ".join(incomplete)}. See {out / "comparison.md"} and the pass logs.')
PY
printf 'Comparison written to %s/comparison.md\n' "$out"
