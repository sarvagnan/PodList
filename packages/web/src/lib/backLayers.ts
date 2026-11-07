import { useRouter } from "@tanstack/react-router"
import { useEffect, useRef } from "react"

const indexKey = "__TSR_index"

/**
 * Back closes one overlay layer at a time (BROWSER-01): each open layer (a sheet, the
 * Now Playing drawer, each page stacked in it) adds a history entry at the same address,
 * so Back pops the top layer instead of leaving the screen beneath. Closing a layer some
 * other way takes its entry back off.
 *
 * `depth` is how many layers are open; `popOne` closes the top one.
 */
export function useBackLayers(depth: number, popOne: () => void) {
  const { history } = useRouter()
  // The history index of each entry this overlay added, bottom first.
  const pushed = useRef<Array<number>>([])
  const pop = useRef(popOne)
  pop.current = popOne

  useEffect(
    () =>
      history.subscribe(({ location }) => {
        const index = location.state[indexKey] ?? 0
        const popped = pushed.current.filter((i) => i > index).length
        if (popped === 0) return
        pushed.current = pushed.current.filter((i) => i <= index)
        for (let i = 0; i < popped; i++) pop.current()
      }),
    [history]
  )

  useEffect(() => {
    while (pushed.current.length < depth) {
      history.push(history.location.href, { podlistLayer: true })
      pushed.current.push(history.location.state[indexKey] ?? 0)
    }
    const extra = pushed.current.length - depth
    if (extra > 0) {
      const top = pushed.current.at(-1)
      pushed.current = pushed.current.slice(0, depth)
      // Only when this overlay's entries are still on top: never undo a navigation.
      if (top === history.location.state[indexKey]) history.go(-extra)
    }
  }, [depth, history])

  useEffect(
    () => () => {
      const top = pushed.current.at(-1)
      const count = pushed.current.length
      pushed.current = []
      if (count > 0 && top === history.location.state[indexKey]) history.go(-count)
    },
    [history]
  )
}
