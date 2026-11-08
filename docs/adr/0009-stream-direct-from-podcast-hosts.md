# Stream directly from podcast hosts by default

Playback uses the Episode’s audio URL from the Device’s local Library, so listening keeps working when the internet works but the PodList server cannot be reached (pod-13u). The host sees the listener’s IP address, as with an ordinary podcast app. A stored download takes priority.

The server proxy remains a fallback for host errors and mixed HTTP content on HTTPS pages. Volume Boost uses the proxy first because Web Audio silences cross-origin media without CORS; if the server fails, a fresh audio element plays directly without boost and the player explains why. Each source is tried once, retaining the Position and speed.

Downloads try the host first and fall back to the proxy when browser CORS or a transfer failure prevents it. The Mac app fetches HTTP(S) audio in its main process through a private same-origin streaming route, keeping renderer web security enabled and other origins’ CORS unchanged. Playback and storage stay behind Player and DownloadStore (ADR 0007).
