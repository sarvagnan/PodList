// Same-user local transport and standalone stdio bridge. No Electron or Node runtime.
#include <atomic>
#include <cstdlib>
#include <stdexcept>
#include <condition_variable>
#include <deque>
#include <memory>
#include <iostream>
#include <map>
#include <mutex>
#include <string>
#include <thread>
#include <vector>
#ifdef _WIN32
#include <windows.h>
#include <sddl.h>
#include <fcntl.h>
#include <io.h>
using Handle = HANDLE;
const Handle invalid = INVALID_HANDLE_VALUE;
void closeHandle(Handle h) { CancelIoEx(h, nullptr); CloseHandle(h); }
int readBytes(Handle h, char* p, int n) { DWORD got = 0; return ReadFile(h, p, n, &got, nullptr) ? int(got) : 0; }
int writeBytes(Handle h, const char* p, int n) { DWORD sent = 0; return WriteFile(h, p, n, &sent, nullptr) ? int(sent) : 0; }
#else
#include <cerrno>
#include <csignal>
#include <cstring>
#include <fcntl.h>
#include <sys/file.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/un.h>
#include <unistd.h>
using Handle = int;
const Handle invalid = -1;
void closeHandle(Handle h) { shutdown(h, SHUT_RDWR); close(h); }
int readBytes(Handle h, char* p, int n) { int r; do { r = int(read(h, p, n)); } while (r < 0 && errno == EINTR); return r; }
int writeBytes(Handle h, const char* p, int n) { int r; do { r = int(write(h, p, n)); } while (r < 0 && errno == EINTR); return r; }
bool sameUser(Handle h) {
#ifdef __linux__
  struct ucred peer; socklen_t size = sizeof(peer);
  return getsockopt(h, SOL_SOCKET, SO_PEERCRED, &peer, &size) == 0 && peer.uid == geteuid();
#else
  uid_t uid; gid_t gid;
  return getpeereid(h, &uid, &gid) == 0 && uid == geteuid();
#endif
}
sockaddr_un address(const std::string& path) {
  sockaddr_un a{}; a.sun_family = AF_UNIX;
  if (path.size() >= sizeof(a.sun_path)) throw std::runtime_error("The MCP socket path is too long.");
  memcpy(a.sun_path, path.c_str(), path.size() + 1); return a;
}
#endif
bool writeAll(Handle h, const std::string& text) {
  size_t at = 0; while (at < text.size()) { int n = writeBytes(h, text.data() + at, int(text.size() - at)); if (n <= 0) return false; at += n; } return true;
}
std::mutex clientsMutex, outputMutex;
struct Client {
  Handle handle;
  std::mutex mutex;
  std::condition_variable changed;
  std::deque<std::string> replies;
  bool alive = true;
  explicit Client(Handle h): handle(h) {}
  ~Client() { closeHandle(handle); }
};
std::map<int, std::shared_ptr<Client>> clients;
std::atomic<bool> stopping{false};
void serveClient(int id, std::shared_ptr<Client> client) {
  Handle h = client->handle;
  std::string buffer; char bytes[8192];
  while (!stopping) {
    int n = readBytes(h, bytes, sizeof(bytes)); if (n <= 0) break;
    buffer.append(bytes, n);
    size_t newline;
    while ((newline = buffer.find('\n')) != std::string::npos) {
      if (newline > 1048576) goto done;
      { std::lock_guard<std::mutex> guard(outputMutex); std::cout << id << '\t' << buffer.substr(0, newline) << '\n' << std::flush; }
      buffer.erase(0, newline + 1);
    }
    if (buffer.size() > 1048576) break;
  }
done:
  { std::lock_guard<std::mutex> guard(clientsMutex); clients.erase(id); }
  { std::lock_guard<std::mutex> guard(client->mutex); client->alive = false; }
  client->changed.notify_all();
}
void acceptClient(Handle h, int& next) {
  std::lock_guard<std::mutex> guard(clientsMutex);
  if (clients.size() >= 8) { closeHandle(h); return; }
#ifndef _WIN32
  timeval timeout{300, 0}; setsockopt(h, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));
#endif
  int id = ++next;
  auto client = std::make_shared<Client>(h); clients[id] = client;
  std::thread([client] {
    std::unique_lock<std::mutex> guard(client->mutex);
    while (client->alive && !stopping) {
      client->changed.wait(guard, [&] { return !client->alive || stopping || !client->replies.empty(); });
      if (!client->alive || stopping) break;
      auto reply = std::move(client->replies.front()); client->replies.pop_front();
      guard.unlock(); bool ok = writeAll(client->handle, reply); guard.lock();
      if (!ok) break;
    }
  }).detach();
  std::thread(serveClient, id, client).detach();
}
#ifdef _WIN32
// Protected DACL, with exactly one allow ACE for the current token's user SID.
struct Security {
  PSECURITY_DESCRIPTOR descriptor = nullptr;
  SECURITY_ATTRIBUTES attributes{sizeof(SECURITY_ATTRIBUTES), nullptr, FALSE};
  Security() {
    HANDLE token; if (!OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &token)) throw std::runtime_error("Could not read this user's token.");
    DWORD size = 0; GetTokenInformation(token, TokenUser, nullptr, 0, &size);
    std::vector<char> data(size);
    bool ok = GetTokenInformation(token, TokenUser, data.data(), size, &size); CloseHandle(token);
    LPSTR sid = nullptr;
    if (!ok || !ConvertSidToStringSidA(reinterpret_cast<TOKEN_USER*>(data.data())->User.Sid, &sid)) throw std::runtime_error("Could not read this user's SID.");
    std::string sddl = "D:P(A;;GA;;;" + std::string(sid) + ")"; LocalFree(sid);
    if (!ConvertStringSecurityDescriptorToSecurityDescriptorA(sddl.c_str(), SDDL_REVISION_1, &descriptor, nullptr)) throw std::runtime_error("Could not restrict the MCP pipe to this user.");
    attributes.lpSecurityDescriptor = descriptor;
  }
  ~Security() { LocalFree(descriptor); }
};
bool samePipeUser(Handle pipe) {
  ULONG pid = 0;
  if (!GetNamedPipeServerProcessId(pipe, &pid)) return false;
  HANDLE process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid);
  if (!process) return false;
  HANDLE serverToken = nullptr, ownToken = nullptr;
  bool ok = OpenProcessToken(process, TOKEN_QUERY, &serverToken) && OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &ownToken);
  CloseHandle(process);
  DWORD serverSize = 0, ownSize = 0;
  if (ok) {
    GetTokenInformation(serverToken, TokenUser, nullptr, 0, &serverSize);
    GetTokenInformation(ownToken, TokenUser, nullptr, 0, &ownSize);
    std::vector<char> server(serverSize), own(ownSize);
    ok = GetTokenInformation(serverToken, TokenUser, server.data(), serverSize, &serverSize) && GetTokenInformation(ownToken, TokenUser, own.data(), ownSize, &ownSize) && EqualSid(reinterpret_cast<TOKEN_USER*>(server.data())->User.Sid, reinterpret_cast<TOKEN_USER*>(own.data())->User.Sid);
  }
  if (serverToken) CloseHandle(serverToken);
  if (ownToken) CloseHandle(ownToken);
  return ok;
}
Handle makePipe(const std::string& path, Security& security, bool first) {
  return CreateNamedPipeA(path.c_str(), PIPE_ACCESS_DUPLEX | (first ? FILE_FLAG_FIRST_PIPE_INSTANCE : 0), PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS, 9, 65536, 65536, 300000, &security.attributes);
}
#endif
void server(const std::string& path) {
  int next = 0;
#ifdef _WIN32
  Security security;
  Handle listener = makePipe(path, security, true);
  if (listener == invalid) throw std::runtime_error("Another PodList app is already serving MCP, or the pipe could not be secured.");
#else
  auto a = address(path);
  std::string directory = path.substr(0, path.find_last_of('/'));
  struct stat info{};
  if (lstat(directory.c_str(), &info) != 0 || !S_ISDIR(info.st_mode) || info.st_uid != geteuid() || chmod(directory.c_str(), 0700) != 0) throw std::runtime_error("The MCP directory must be owned by this user.");
  int lock = open((directory + "/mcp.lock").c_str(), O_CREAT | O_RDWR | O_NOFOLLOW | O_CLOEXEC, 0600);
  if (lock < 0 || flock(lock, LOCK_EX | LOCK_NB) != 0) throw std::runtime_error("Another PodList app is already serving MCP.");
  if (lstat(path.c_str(), &info) == 0) {
    if (!S_ISSOCK(info.st_mode) || info.st_uid != geteuid()) throw std::runtime_error("An unexpected file occupies the MCP socket path.");
    if (unlink(path.c_str()) != 0) throw std::runtime_error("Could not remove the old MCP socket.");
  }
  Handle listener = socket(AF_UNIX, SOCK_STREAM, 0);
  // The directory is already private; umask also protects the socket before chmod.
  umask(0077);
  if (listener < 0 || bind(listener, reinterpret_cast<sockaddr*>(&a), sizeof(a)) != 0 || chmod(path.c_str(), 0600) != 0 || listen(listener, 8) != 0) throw std::runtime_error("Could not bind and secure the MCP socket.");
#endif
  std::cout << "ready\n" << std::flush;
  std::thread([&, listener]() mutable {
    while (!stopping) {
#ifdef _WIN32
      if (ConnectNamedPipe(listener, nullptr) || GetLastError() == ERROR_PIPE_CONNECTED) {
        acceptClient(listener, next);
        listener = makePipe(path, security, false);
        if (listener == invalid) break;
      } else break;
#else
      Handle client = accept(listener, nullptr, nullptr);
      if (client < 0) break;
      if (!sameUser(client)) { closeHandle(client); continue; }
      acceptClient(client, next);
#endif
    }
  }).detach();
  std::string line;
  while (std::getline(std::cin, line)) {
    auto tab = line.find('\t'); if (tab == std::string::npos) continue;
    int id; try { id = std::stoi(line.substr(0, tab)); } catch (...) { continue; }
    std::shared_ptr<Client> client;
    { std::lock_guard<std::mutex> guard(clientsMutex); auto it = clients.find(id); if (it != clients.end()) client = it->second; }
    if (client) {
      std::lock_guard<std::mutex> guard(client->mutex);
      if (client->replies.size() >= 64) { client->alive = false; }
      else client->replies.push_back(line.substr(tab + 1) + "\n");
      client->changed.notify_all();
    }
  }
  stopping = true;
  { std::lock_guard<std::mutex> guard(clientsMutex); for (auto& entry : clients) {
#ifdef _WIN32
    CancelIoEx(entry.second->handle, nullptr);
#else
    shutdown(entry.second->handle, SHUT_RDWR);
#endif
    entry.second->changed.notify_all();
  } clients.clear(); }
  closeHandle(listener);
#ifndef _WIN32
  unlink(path.c_str()); close(lock);
#endif
  // Detached readers must not outlive process-owned transport state.
  std::_Exit(0);
}
void clean(const std::string& path) {
#ifndef _WIN32
  std::string directory = path.substr(0, path.find_last_of('/'));
  struct stat info{};
  if (lstat(directory.c_str(), &info) != 0) return;
  if (!S_ISDIR(info.st_mode) || info.st_uid != geteuid()) throw std::runtime_error("The MCP directory must be owned by this user.");
  int lock = open((directory + "/mcp.lock").c_str(), O_CREAT | O_RDWR | O_NOFOLLOW | O_CLOEXEC, 0600);
  if (lock < 0) throw std::runtime_error("Could not lock the MCP directory.");
  if (flock(lock, LOCK_EX | LOCK_NB) != 0) { close(lock); return; }
  if (lstat(path.c_str(), &info) == 0) {
    if (!S_ISSOCK(info.st_mode) || info.st_uid != geteuid()) { close(lock); throw std::runtime_error("An unexpected file occupies the MCP socket path."); }
    if (unlink(path.c_str()) != 0) { close(lock); throw std::runtime_error("Could not remove the old MCP socket."); }
  }
  close(lock);
#endif
}
void bridge(const std::string& path) {
#ifdef _WIN32
  // Identification level prevents a squatted pipe from impersonating the bridge.
  Handle h = CreateFileA(path.c_str(), GENERIC_READ | GENERIC_WRITE, 0, nullptr, OPEN_EXISTING, SECURITY_SQOS_PRESENT | SECURITY_IDENTIFICATION, nullptr);
  if (h != invalid && !samePipeUser(h)) { closeHandle(h); h = invalid; }
#else
  auto a = address(path); Handle h = socket(AF_UNIX, SOCK_STREAM, 0);
  if (h != invalid && (connect(h, reinterpret_cast<sockaddr*>(&a), sizeof(a)) != 0 || !sameUser(h))) { closeHandle(h); h = invalid; }
#endif
  if (h == invalid) throw std::runtime_error("Could not connect to PodList: the app is not running or MCP is turned off in PodList Settings. Open PodList and enable the MCP server in Settings > Automation, then retry.");
  std::atomic<bool> ended{false};
  std::thread([&] {
    char bytes[8192];
#ifdef _WIN32
    Handle input = GetStdHandle(STD_INPUT_HANDLE);
#else
    Handle input = STDIN_FILENO;
#endif
    int n; while ((n = readBytes(input, bytes, sizeof(bytes))) > 0) { if (!writeAll(h, std::string(bytes, n))) break; }
    ended = true;
#ifdef _WIN32
    closeHandle(h);
#else
    shutdown(h, SHUT_WR);
#endif
  }).detach();
  char bytes[8192]; int n;
  while ((n = readBytes(h, bytes, sizeof(bytes))) > 0) { std::cout.write(bytes, n); std::cout.flush(); }
  if (!ended) { std::cerr << "PodList closed the connection: MCP was turned off in Settings or the app quit.\n"; std::_Exit(1); }
  std::_Exit(0);
}
int main(int argc, char** argv) {
#ifndef _WIN32
  signal(SIGPIPE, SIG_IGN);
#else
  _setmode(_fileno(stdin), _O_BINARY); _setmode(_fileno(stdout), _O_BINARY);
#endif
  try {
    if (argc == 4 && std::string(argv[1]) == "--serve" && std::string(argv[2]) == "--socket") server(argv[3]);
    else if (argc == 4 && std::string(argv[1]) == "--clean" && std::string(argv[2]) == "--socket") clean(argv[3]);
    else if (argc == 3 && std::string(argv[1]) == "--socket") bridge(argv[2]);
    else throw std::runtime_error("Usage: podlist-mcp --socket <local socket or pipe> (open PodList with MCP enabled first)");
  } catch (const std::exception& e) { std::cerr << e.what() << '\n'; return 1; }
}
