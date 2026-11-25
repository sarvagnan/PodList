const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"])
const badAddress =
  "Enter an HTTPS server address, or http://127.0.0.1:PORT for the local demo. Use only the address, without a path or sign-in details."

export function serverOrigin(input: string) {
  const address = input.trim()
  let url: URL
  try {
    url = new URL(address)
  } catch {
    throw new Error(badAddress)
  }
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && localHosts.has(url.hostname))) ||
    url.username ||
    url.password ||
    url.port === "0" ||
    !/^https?:\/\/[^/?#\\]+\/?$/i.test(address)
  )
    throw new Error(badAddress)
  return url.origin
}

type WebFetch = (url: string, init: RequestInit) => Promise<Response>

export async function checkServer(origin: string, request: WebFetch) {
  let response: Response
  try {
    response = await request(new URL("/api/health", origin).href, {
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(8000)
    })
  } catch {
    return "Could not reach the server. Check the address and your connection, then try again."
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined)
    return `The server returned HTTP ${response.status}. Try again.`
  }
  const health: unknown = await response.json().catch(() => null)
  if (
    !health ||
    typeof health !== "object" ||
    !("status" in health) ||
    health.status !== "ok" ||
    !("protocolVersion" in health) ||
    typeof health.protocolVersion !== "number" ||
    !Number.isSafeInteger(health.protocolVersion) ||
    health.protocolVersion < 1
  )
    return "The server returned an unreadable response. Check the address and try again."
  return null
}
