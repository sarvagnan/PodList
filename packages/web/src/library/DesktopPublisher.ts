import type {
  DirectoryPodcast,
  FeedRead,
  FeedValidators,
  publisherFeeds
} from "@podlist/feeds/publisher"

const request = async <A>(path: string, parameters: URLSearchParams, signal?: AbortSignal) => {
  const response = await fetch(`/publisher/${path}?${parameters}`, {
    credentials: "omit",
    ...(signal ? { signal } : {})
  })
  if (!response.ok) {
    const result: unknown = await response.json().catch(() => null)
    throw new Error(
      result &&
        typeof result === "object" &&
        "message" in result &&
        typeof result.message === "string"
        ? result.message
        : "Could not reach the publisher. Try again."
    )
  }
  return (await response.json()) as A
}

export const desktopPublisher: ReturnType<typeof publisherFeeds> = {
  audioChapters: (url, signal) =>
    request<Awaited<ReturnType<ReturnType<typeof publisherFeeds>["audioChapters"]>>>(
      "audio-chapters",
      new URLSearchParams({ value: url }),
      signal
    ),
  chapters: (url, signal) =>
    request<Awaited<ReturnType<ReturnType<typeof publisherFeeds>["chapters"]>>>(
      "chapters",
      new URLSearchParams({ value: url }),
      signal
    ),
  read: (feedUrl: string, validators?: FeedValidators, signal?: AbortSignal) => {
    const parameters = new URLSearchParams({ value: feedUrl })
    if (validators?.etag) parameters.set("etag", validators.etag)
    if (validators?.lastModified) parameters.set("lastModified", validators.lastModified)
    return request<FeedRead>("read", parameters, signal)
  },
  search: (query: string, signal?: AbortSignal) =>
    request<ReadonlyArray<DirectoryPodcast>>(
      "search",
      new URLSearchParams({ value: query }),
      signal
    )
}
