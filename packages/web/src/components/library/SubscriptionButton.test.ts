import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { SubscriptionButton } from "./SubscriptionButton.tsx"

let root: Root
let host: HTMLDivElement
const unsubscribe = vi.fn()
const subscribe = vi.fn()
const render = (subscribed = true, busy = false) =>
  act(async () =>
    root.render(
      createElement(SubscriptionButton, {
        title: "Deep Field",
        subscribed,
        busy,
        onSubscribe: subscribe,
        onUnsubscribe: unsubscribe
      })
    )
  )
const button = () => host.querySelector("button") as HTMLButtonElement
const click = () => act(async () => button().click())
const armed = () => expect(button().getAttribute("aria-label")).toBe("Unsubscribe")
const disarmed = () => expect(button().getAttribute("aria-label")).toBe("Subscribed to Deep Field")

beforeEach(() => {
  vi.useFakeTimers()
  unsubscribe.mockClear()
  subscribe.mockClear()
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
})

it("announces arming and only unsubscribes on the second activation", async () => {
  await render()
  await click()
  armed()
  expect(host.querySelector('[role="status"]')?.textContent).toContain(
    "Activate again within five seconds"
  )
  expect(unsubscribe).not.toHaveBeenCalled()
  await click()
  expect(unsubscribe).toHaveBeenCalledOnce()
  disarmed()
})

it("expires after five seconds and ignores activations while saving", async () => {
  await render()
  await click()
  await act(async () => vi.advanceTimersByTime(5000))
  disarmed()
  await click()
  armed()
  expect(unsubscribe).not.toHaveBeenCalled()
  await render(true, true)
  await click()
  expect(unsubscribe).not.toHaveBeenCalled()
  await render()
  disarmed()
})

it.each(["pointerdown", "click", "focusin", "scroll", "keydown", "blur", "popstate"])(
  "disarms on %s away from the control",
  async (type) => {
    await render()
    await click()
    armed()
    await act(async () => {
      const event =
        type === "keydown"
          ? new KeyboardEvent(type, { key: "Escape", bubbles: true })
          : new Event(type, { bubbles: true })
      if (type === "blur" || type === "popstate") window.dispatchEvent(event)
      else document.body.dispatchEvent(event)
    })
    disarmed()
    await click()
    expect(unsubscribe).not.toHaveBeenCalled()
  }
)

it("keeps Enter and Space on the control armed, and resets after focus leaves", async () => {
  await render()
  await act(async () => button().focus())
  await click()
  for (const key of ["Enter", " "]) {
    await act(async () =>
      button().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))
    )
    armed()
  }
  await act(async () => button().blur())
  disarmed()
})

it("offers Subscribe on the retained Podcast page and clears arming on subscription changes", async () => {
  await render()
  await click()
  await render(false)
  expect(button().textContent).toBe("Subscribe")
  await click()
  expect(subscribe).toHaveBeenCalledOnce()
  expect(unsubscribe).not.toHaveBeenCalled()
  await render()
  disarmed()
})

it("removes timers and listeners when leaving the page", async () => {
  await render()
  await click()
  await act(async () => root.render(null))
  expect(vi.getTimerCount()).toBe(0)
  await render()
  disarmed()
})
