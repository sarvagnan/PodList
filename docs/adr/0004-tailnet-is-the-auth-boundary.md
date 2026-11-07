# The tailnet is the authentication boundary

The server runs in its own Incus container on the user's IncusOS box, published only on their Tailscale network by Tailscale Serve (it listens on localhost inside the container), and has no login of its own: being able to reach it over the tailnet is what grants access. It is a single-user system, so there is no user model either. If it is ever exposed beyond the tailnet, an app password must be added first; do not "just open a port".
