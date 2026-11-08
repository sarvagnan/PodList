/** Raw streaming routes, shared by the server and the OpenAPI generator. */
export const audioPath = "/api/episodes/:id/audio"
export const artworkPath = "/api/artwork"
export const forwardedRequestHeaders = [
  "range",
  "if-range",
  "if-none-match",
  "if-modified-since"
] as const
export const forwardedResponseHeaders = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
  "cache-control"
] as const
