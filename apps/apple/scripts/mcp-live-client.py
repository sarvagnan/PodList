#!/usr/bin/env python3
"""Live client for the bundled bridge; UI checkpoints belong to XCUITest."""
import json
import os
from pathlib import Path
import plistlib
import select
import stat
import subprocess
import sys
import time

VERSION = '2026-07-28'
META = {
    'io.modelcontextprotocol/protocolVersion': VERSION,
    'io.modelcontextprotocol/clientCapabilities': {},
    'io.modelcontextprotocol/clientInfo': {'name': 'PodList VM live check', 'version': '1'},
}


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def wait_for(path, timeout=60):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if path.exists():
            return
        time.sleep(0.1)
    raise TimeoutError(f'Timed out waiting for {path.name}')


class Client:
    def __init__(self, bridge, environment, transcript, stderr):
        self.process = subprocess.Popen([str(bridge)], stdin=subprocess.PIPE,
                                        stdout=subprocess.PIPE, stderr=stderr, env=environment)
        self.transcript = transcript
        self.buffer = b''
        self.sequence = 0

    def rpc(self, method, params=None):
        self.sequence += 1
        request = {'jsonrpc': '2.0', 'id': self.sequence, 'method': method,
                   'params': {**(params or {}), '_meta': META}}
        self.transcript.write(json.dumps({'send': request}) + '\n')
        self.transcript.flush()
        self.process.stdin.write(json.dumps(request).encode() + b'\n')
        self.process.stdin.flush()
        end = time.monotonic() + 30
        while b'\n' not in self.buffer:
            remaining = end - time.monotonic()
            require(remaining > 0, f'{method}: response timed out')
            ready, _, _ = select.select([self.process.stdout], [], [], remaining)
            require(ready, f'{method}: response timed out')
            chunk = os.read(self.process.stdout.fileno(), 65536)
            require(chunk, f'{method}: bridge closed stdout (see bridge stderr)')
            self.buffer += chunk
        line, self.buffer = self.buffer.split(b'\n', 1)
        response = json.loads(line)
        self.transcript.write(json.dumps({'receive': response}) + '\n')
        self.transcript.flush()
        require(response.get('jsonrpc') == '2.0' and response.get('id') == self.sequence,
                f'{method}: invalid JSON-RPC response')
        return response

    def result(self, method, params=None):
        response = self.rpc(method, params)
        require('error' not in response, f'{method}: {response.get("error")}')
        result = response['result']
        require(result.get('resultType') == 'complete', f'{method}: incomplete result')
        require(result['_meta']['io.modelcontextprotocol/serverInfo']['name'] == 'PodList',
                f'{method}: missing server identity')
        return result

    def tool(self, name, **arguments):
        result = self.result('tools/call', {'name': name, 'arguments': arguments})
        require(result.get('isError') is False, f'{name}: {result}')
        value = result['structuredContent']
        require(json.loads(result['content'][0]['text']) == value,
                f'{name}: text and structured content disagree')
        return value

    def stop(self):
        if self.process.poll() is None:
            self.process.terminate()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait()
        self.process.stdin.close()
        self.process.stdout.close()


def main():
    require(len(sys.argv) == 3, 'Usage: mcp-live-client.py <guest-run-directory> <runner-exchange-directory>')
    run = Path(sys.argv[1]).resolve()
    require((run / 'system-vm').is_file(), 'Disposable VM marker is required')
    app = Path('/Applications/PodList UI Check.app')
    with (app / 'Contents/Info.plist').open('rb') as file:
        identity = plistlib.load(file)['CFBundleIdentifier']
    require(identity == 'app.podlist.uitour.system', 'Non-test identity refused')
    data = (run / 'system/data').resolve()
    require(str(data).startswith(('/private/tmp/', '/tmp/')), 'Non-temporary data refused')
    exchange = Path(sys.argv[2]).resolve()
    require(exchange.is_dir() and exchange.name.startswith('podlist-mcp-'), 'Runner exchange is required')
    environment = {**os.environ, 'PODLIST_UI_DATA_DIRECTORY': str(data)}
    bridge = app / 'Contents/MacOS/podlist-mcp'
    socket = data / 'Automation/mcp.sock'
    wait_for(socket)
    require(stat.S_ISSOCK(socket.stat().st_mode), 'Missing Unix socket')
    require(stat.S_IMODE(socket.stat().st_mode) == 0o600, 'Socket must be 0600')
    require(stat.S_IMODE(socket.parent.stat().st_mode) == 0o700, 'Socket directory must be 0700')
    require(socket.stat().st_uid == os.getuid(), 'Socket must belong to this user')

    with (run / 'system/mcp-transcript.jsonl').open('w') as transcript, \
            (run / 'system/mcp-bridge.stderr').open('w') as stderr:
        client = Client(bridge, environment, transcript, stderr)
        try:
            # The supported revision is stateless. Assert legacy initialization rejection,
            # then discover using the mandatory metadata on every request.
            rejected = client.rpc('initialize', {'protocolVersion': VERSION,
                                                'capabilities': {},
                                                'clientInfo': {'name': 'VM check', 'version': '1'}})
            require(rejected['error']['code'] == -32022, 'initialize must be rejected')
            require(VERSION in rejected['error']['data']['supported'], 'Wrong supported revision')
            discovery = client.result('server/discover')
            require(discovery['supportedVersions'] == [VERSION], 'Wrong protocol revision')
            require(discovery['capabilities']['tools']['listChanged'] is False, 'Unexpected capabilities')
            catalog = client.result('tools/list')
            for value in (discovery, catalog):
                require(value['ttlMs'] == 300000 and value['cacheScope'] == 'private', 'Wrong cache policy')
            names = [tool['name'] for tool in catalog['tools']]
            require(names == sorted(set(names)), 'Catalog must be sorted and unique')
            require({'search_episodes', 'list_views', 'list_playlists', 'list_episodes',
                     'now_playing', 'set_starred'}.issubset(names), 'Missing tools')
            require(all(tool['inputSchema']['type'] == 'object' for tool in catalog['tools']), 'Missing schemas')
            require(client.tool('list_views')['views'], 'Demo Views missing')
            require(client.tool('list_playlists')['playlists'], 'Demo Playlists missing')
            require(client.tool('now_playing')['playing'] is False, 'Demo should remain paused')
            episodes = client.tool('search_episodes', text='Market', limit=200)
            require(episodes['episodes'] and episodes['total'] >= len(episodes['episodes']), 'Search returned no fixture Episodes')
            episode = episodes['episodes'][0]
            episode_id, original = episode['id'], episode['starred']

            def starred():
                rows = client.tool('search_episodes', text='Market', limit=200)['episodes']
                return next(row['starred'] for row in rows if row['id'] == episode_id)

            edit = client.tool('set_starred', episode_ids=[episode_id], starred=not original)
            undo = 'Undo Unstar' if original else 'Undo Star'
            require(edit['undo'] == undo, 'MCP edit did not register named Undo')
            require(starred() is not original, 'Star edit did not persist')
            (exchange / 'undo-title').write_text(undo)
            (exchange / 'edit-ready').touch()
            wait_for(exchange / 'undo-done')
            end = time.monotonic() + 20
            while starred() != original:
                require(time.monotonic() < end, 'Native Undo failed to restore the original mark')
                time.sleep(0.2)
            (exchange / 'undo-verified').touch()
            wait_for(exchange / 'window-closed')
            require(socket.exists(), 'Closing the last window removed the listener')
            client.tool('now_playing')  # Existing bridge session survives window close.
            # A new bundled bridge must connect too, proving the listener still accepts.
            fresh = Client(bridge, environment, transcript, stderr)
            try:
                fresh.result('server/discover')
            finally:
                fresh.stop()
            (exchange / 'closed-verified').touch()
            wait_for(exchange / 'reopen-requested')
            # Launch outside XCTest's sandbox, while XCTest asserts the window and PID.
            subprocess.run(['/usr/bin/open', str(app)], check=True, timeout=20)
            (exchange / 'reopen-opened').touch()
            wait_for(exchange / 'window-reopened')
            require(starred() == original, 'Reopen lost the restored Episode state')
            client.tool('now_playing')
            (exchange / 'reopen-verified').touch()
            wait_for(exchange / 'app-quit')
            end = time.monotonic() + 10
            while socket.exists() and time.monotonic() < end:
                time.sleep(0.1)
            require(not socket.exists(), 'Native Quit left the socket behind')
            require(client.process.wait(timeout=10) == 1, 'Quit must close the live bridge connection')
            summary = {'status': 'passed', 'protocol': VERSION, 'tools': names,
                       'edited_episode': episode_id, 'original_starred': original,
                       'native_undo': undo, 'window_close_existing_and_new_clients': True,
                       'same_process_reopen_checked_by_xcuitest': True, 'quit_removes_socket': True}
            (run / 'system/mcp-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
            (exchange / 'complete').touch()
            print(json.dumps(summary, indent=2), flush=True)
        finally:
            client.stop()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Fail the UI checkpoint promptly, and keep the full traceback in the guest log.
        if len(sys.argv) == 3:
            (Path(sys.argv[2]) / 'client-failed').write_text(str(error))
        raise
