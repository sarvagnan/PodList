"""Guest-side process memory sampler for the two response timing modes."""

import ctypes
import json
import os
import statistics
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

INTERVAL = 2
MIB = 1024 * 1024
RUSAGE_INFO_V0 = 0


class RusageInfo(ctypes.Structure):
    # RUSAGE_INFO_V0 from <sys/resource.h>. Both metrics are current byte counts.
    _fields_ = [
        ("uuid", ctypes.c_ubyte * 16),
        ("user_time", ctypes.c_uint64),
        ("system_time", ctypes.c_uint64),
        ("package_idle_wakeups", ctypes.c_uint64),
        ("interrupt_wakeups", ctypes.c_uint64),
        ("pageins", ctypes.c_uint64),
        ("wired_size", ctypes.c_uint64),
        ("resident_size", ctypes.c_uint64),
        ("physical_footprint", ctypes.c_uint64),
        ("start_time", ctypes.c_uint64),
        ("exit_time", ctypes.c_uint64),
    ]


@dataclass
class Process:
    pid: int
    parent: int
    path: str
    command: str


def process_tree(bundle, main_pid=None):
    libproc = ctypes.CDLL("/usr/lib/libproc.dylib")
    libproc.proc_pidpath.argtypes = [ctypes.c_int, ctypes.c_void_p, ctypes.c_uint32]
    path = ctypes.create_string_buffer(4096)  # PROC_PIDPATHINFO_MAXSIZE on macOS
    output = subprocess.check_output(["/bin/ps", "-axww", "-o", "pid=,ppid=,command="], text=True)
    processes = {}
    for line in output.splitlines():
        columns = line.split(None, 2)
        if len(columns) < 2:
            continue
        pid, parent = map(int, columns[:2])
        command = columns[2] if len(columns) == 3 else ""
        if "PodListUITour-Runner.app/" in command:
            continue
        length = libproc.proc_pidpath(pid, path, len(path))
        processes[pid] = Process(pid, parent, os.fsdecode(path.value) if length > 0 else "", command)

    # Have roots from the exact app bundle, even for XPC services spawned by launchd.
    # The Electron launch PID also anchors descendants whose executable is elsewhere.
    included = {pid for pid, process in processes.items() if process.path.startswith(bundle + "/")}
    if main_pid is not None and main_pid in processes:
        included.add(main_pid)
    while True:
        children = {pid for pid, process in processes.items() if process.parent in included}
        if children <= included:
            break
        included.update(children)
    return [processes[pid] for pid in sorted(included)]


def sample(bundle, main_pid):
    libproc = ctypes.CDLL("/usr/lib/libproc.dylib")
    libproc.proc_pid_rusage.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.POINTER(RusageInfo)]
    rows = []
    for process in process_tree(bundle, main_pid):
        usage = RusageInfo()
        if libproc.proc_pid_rusage(process.pid, RUSAGE_INFO_V0, ctypes.byref(usage)) == 0:
            counts = (usage.physical_footprint, usage.resident_size)
        else:
            counts = None
        # A Chromium utility process can share an executable name with other process types.
        name = Path(process.path).name if process.path else process.command
        role = next((word for word in process.command.split() if word.startswith("--type=")), "")
        rows.append((process.pid, process.parent, name, role, counts))
    return rows


def totals(rows):
    if not rows or any(counts is None for *_, counts in rows):
        return None
    return tuple(sum(counts[index] for *_, counts in rows) for index in range(2))


def usage_text(counts):
    if counts is None:
        return "unobserved"
    return f"footprint={counts[0] / MIB:.1f} MiB, RSS={counts[1] / MIB:.1f} MiB"


def write_report(out, mode, baseline, samples):
    valid = [counts for _, rows in samples if (counts := totals(rows)) is not None]
    median = tuple(map(statistics.median, zip(*valid))) if valid else None
    peak = tuple(map(max, zip(*valid))) if valid else None
    lines = [
        "Memory in the Tart guest",
        "Method: macOS libproc proc_pid_rusage (RUSAGE_INFO_V0), physical footprint and RSS in MiB.",
        "Totals sum the per-process counters. RSS can count shared pages in more than one process.",
        "Includes processes in the app bundle (including launchd-hosted XPC) and their descendants.",
        "Excludes the XCUITest runner, Playwright driver, sampler, demo server and shared macOS services.",
        "The guest settles before launch. The launch sample is taken when the app is ready for timing.",
        f"During the timing loop (including warm-ups), samples are targeted every {INTERVAL} s.",
        "Native accessibility is active for XCUITest. Electron has an active DevTools automation connection.",
        "Both may inflate memory. Sampling can also perturb responsiveness timings.",
        (
            "Native sampling is gated by the timing activity and the report attachment in the XCUITest log."
            if mode == "timings"
            else "Electron sampling is gated by the readiness and completion markers from the Playwright driver."
        ),
        "",
        f"Launch settled: {usage_text(totals(baseline or []))}",
        f"Timing median: {usage_text(median)}",
        f"Timing peak: {usage_text(peak)}",
        f"Complete timing samples: {len(valid)}/{len(samples)}",
        "",
    ]

    def breakdown(title, rows):
        lines.extend([f"{title}: {usage_text(totals(rows))}", "PID\tPPID\tProcess\tType\tMemory"])
        for pid, parent, name, role, counts in rows:
            lines.append(f"{pid}\t{parent}\t{name}\t{role}\t{usage_text(counts)}")
        lines.append("")

    if baseline is not None:
        breakdown("Launch process breakdown", baseline)
    for elapsed, rows in samples:
        breakdown(f"Timing +{elapsed:.2f} s", rows)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")


def collect(run, mode):
    stop = run / "memory-stop"
    log = run / "xcodebuild-guest.log"
    ready = run / "memory-electron-ready.json"
    done = run / "memory-electron-done"
    native = mode == "timings"

    begin = b"begin response timing runs"
    end = (b"light--timings.txt", b"testtimingslight]' passed", b"testtimingslight]' failed")
    seen = set()
    offset = 0
    tail = b""

    def read_native_markers():
        nonlocal offset, tail
        # Read appended output only. Retain enough bytes for a partial marker at EOF.
        with log.open("rb") as stream:
            stream.seek(offset)
            text = tail + stream.read().lower()
            offset = stream.tell()
        seen.update(marker for marker in (begin, *end) if marker in text)
        tail = text[-max(map(len, (begin, *end))):]

    baseline = None
    samples = []
    try:
        while not stop.exists():
            if native:
                read_native_markers()
                if begin in seen:
                    bundle, main_pid = os.path.realpath(run / "light/PodList.app"), None
                    break
            elif ready.exists():
                launch = json.loads(ready.read_text())
                bundle, main_pid = os.path.realpath(launch["bundle"]), launch["pid"]
                break
            time.sleep(0.1)
        else:
            return

        started = time.monotonic()
        baseline = sample(bundle, main_pid)
        if not native:
            (run / "memory-electron-ack").touch()

        next_sample = started + INTERVAL
        while not stop.exists():
            if native:
                read_native_markers()
                if seen.intersection(end):
                    break
            elif done.exists():
                break
            now = time.monotonic()
            if now >= next_sample:
                samples.append((now - started, sample(bundle, main_pid)))
                next_sample = now + INTERVAL
            else:
                time.sleep(min(next_sample - now, 0.25))
    finally:
        write_report(run / "memory.txt", mode, baseline, samples)


if __name__ == "__main__":
    collect(Path(sys.argv[1]), sys.argv[2])
