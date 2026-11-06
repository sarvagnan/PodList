# The tailnet is the authentication boundary

The server runs as a Docker container on the user's Tailscale network and has no login of its own: being able to reach it over the tailnet is what grants access. It is a single-user system, so there is no user model either. If it is ever exposed beyond the tailnet, an app password must be added first; do not "just open a port".
