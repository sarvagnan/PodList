const form = document.getElementById("form")
const input = document.getElementById("address")
const error = document.getElementById("error")
const button = form.querySelector("button")

// The page's one task is this field, so start there.
input.focus()
const cancel = document.getElementById("cancel")
const standalone = document.getElementById("standalone")
window.podlist.setup().then(({ current, last, active, mac }) => {
  if (!input.value) input.value = current ?? last ?? ""
  cancel.hidden = !active
  if (mac) standalone.textContent = "Start on This Mac"
})
cancel.addEventListener("click", () => window.podlist.cancel())
standalone.addEventListener("click", async () => {
  standalone.disabled = true
  button.disabled = true
  error.textContent = ""
  try {
    await window.podlist.startStandalone()
  } catch {
    standalone.disabled = false
    button.disabled = false
    error.textContent = "Could not open the local Library. Try again."
  }
})

form.addEventListener("submit", async (event) => {
  event.preventDefault()
  error.textContent = ""
  button.disabled = true
  cancel.disabled = true
  standalone.disabled = true
  input.readOnly = true
  button.textContent = "Checking…"
  const problem = await window.podlist
    .connect(input.value.trim())
    .catch(() => "Could not open the local Library. Try again.")
  if (problem) {
    error.textContent = problem
    button.disabled = false
    cancel.disabled = false
    standalone.disabled = false
    input.readOnly = false
    button.textContent = "Check and Connect"
    input.focus()
  }
})
