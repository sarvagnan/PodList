export interface Page<A> {
  readonly items: ReadonlyArray<A>
  readonly continuation: string | null
  readonly total: number
}
export interface PageControls<A> {
  readonly total: number
  readonly more: (() => Promise<ReadonlyArray<A>>) | null
}
const controls = new WeakMap<ReadonlyArray<unknown>, PageControls<unknown>>()
export const pageControls = <A>(items: ReadonlyArray<A>): PageControls<A> | undefined =>
  controls.get(items) as PageControls<A> | undefined

/** Keep loaded depth on invalidation, then replace the rows together. This avoids
 * collapsing the scroll range and keeps selection keyed by Episode id. */
export class PagedRead<A> {
  private depth = 1
  private generation = 0
  private readonly fetchPage: (continuation?: string) => Promise<Page<A>>
  constructor(fetchPage: (continuation?: string) => Promise<Page<A>>) {
    this.fetchPage = fetchPage
  }

  async read(depth = this.depth): Promise<ReadonlyArray<A>> {
    const generation = ++this.generation
    for (let attempt = 0; ; attempt++) {
      try {
        let page = await this.fetchPage()
        const items = [...page.items]
        let loaded = 1
        while (loaded < depth && page.continuation !== null) {
          page = await this.fetchPage(page.continuation)
          items.push(...page.items)
          loaded++
        }
        if (generation === this.generation) this.depth = loaded
        const continuation = page.continuation
        let next: Promise<ReadonlyArray<A>> | undefined
        controls.set(items, {
          total: page.total,
          more:
            continuation === null
              ? null
              : () =>
                  (next ??= this.append(items, continuation, loaded, generation).catch((error) => {
                    next = undefined
                    throw error
                  }))
        })
        return items
      } catch (error) {
        if (!changed(error) || attempt >= 2) throw error
      }
    }
  }

  private async append(
    items: ReadonlyArray<A>,
    continuation: string,
    loaded: number,
    generation: number
  ): Promise<ReadonlyArray<A>> {
    try {
      const page = await this.fetchPage(continuation)
      if (generation !== this.generation) return this.read(this.depth)
      this.depth = loaded + 1
      const result = [...items, ...page.items]
      let next: Promise<ReadonlyArray<A>> | undefined
      controls.set(result, {
        total: page.total,
        more:
          page.continuation === null
            ? null
            : () =>
                (next ??= this.append(
                  result,
                  page.continuation as string,
                  loaded + 1,
                  generation
                ).catch((error) => {
                  next = undefined
                  throw error
                }))
      })
      return result
    } catch (error) {
      if (!changed(error)) throw error
      return this.read(loaded + 1)
    }
  }
}
const changed = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  (error._tag === "ReadChanged" || error._tag === "InvalidContinuation")
