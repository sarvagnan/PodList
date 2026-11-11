import { useCallback, useEffect, useRef, useState } from "react"
import { pageControls } from "../data/PagedRead.ts"

/** Local adapters return ordinary arrays. Server arrays carry continuation controls. */
export function usePagedItems<A>(source: ReadonlyArray<A>) {
  const [loaded, setLoaded] = useState({ source, items: source })
  const items = loaded.source === source ? loaded.items : source
  const current = useRef(source)
  current.current = source
  const [request, setRequest] = useState({ source, loading: false, error: false })
  const loading = request.source === source && request.loading
  const error = request.source === source && request.error
  const busy = useRef<ReadonlyArray<A> | null>(null)
  const controls = pageControls(items)
  const more = controls?.more
  const loadMore = useCallback(() => {
    if (!more || busy.current === source) return
    busy.current = source
    setRequest({ source, loading: true, error: false })
    void more()
      .then((next) => {
        if (current.current === source) setLoaded({ source, items: next })
      })
      .catch(() => {
        if (current.current === source) setRequest({ source, loading: false, error: true })
      })
      .finally(() => {
        if (busy.current === source) busy.current = null
        setRequest((request) =>
          request.source === source ? { ...request, loading: false } : request
        )
      })
  }, [source, more])
  const all = async () => {
    let next = items
    for (;;) {
      const more = pageControls(next)?.more
      if (!more) break
      next = await more()
    }
    if (current.current === source) setLoaded({ source, items: next })
    return next
  }
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = sentinel.current
    if (!element || !more || error) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore()
      },
      { rootMargin: "600px" }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [more, loadMore, error])
  return {
    items,
    all,
    total: controls?.total ?? items.length,
    more: !!more,
    loadMore,
    loading,
    error,
    sentinel
  }
}
