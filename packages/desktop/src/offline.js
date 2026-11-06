const url = new URLSearchParams(location.search).get("url")
if (url) {
  document.getElementById("detail").textContent =
    `PodList needs to reach ${new URL(url).host} once to set up this Mac. Check that Tailscale is connected.`
}
document.getElementById("retry").addEventListener("click", () => {
  if (url) location.href = url
})
document.getElementById("retry").focus()
