const form = document.getElementById("form")
const input = document.getElementById("address")
const error = document.getElementById("error")
const button = form.querySelector("button")

// The page's one task is this field, so start there.
input.focus()
const cancel = document.getElementById("cancel")
window.podlist.server().then((current) => {
  if (current) {
    input.value = current
    // Changing server: offer the way back to the current one.
    cancel.hidden = false
  }
})
cancel.addEventListener("click", () => window.podlist.cancel())

form.addEventListener("submit", async (event) => {
  event.preventDefault()
  error.textContent = ""
  button.disabled = true
  button.textContent = "Connecting…"
  const problem = await window.podlist.connect(input.value.trim())
  if (problem) {
    error.textContent = problem
    button.disabled = false
    button.textContent = "Connect"
    input.focus()
  }
})
