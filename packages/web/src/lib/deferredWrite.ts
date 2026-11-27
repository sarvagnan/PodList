/** Coalesces writes during interaction while letting the owner flush on exit. */
export const deferredWrite = <A>(write: (latest: A) => void, delay = 150) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: { value: A } | undefined
  const flush = () => {
    clearTimeout(timer)
    const next = pending
    pending = undefined
    if (next) write(next.value)
  }
  return {
    set(value: A) {
      pending = { value }
      clearTimeout(timer)
      timer = setTimeout(flush, delay)
    },
    flush
  }
}
