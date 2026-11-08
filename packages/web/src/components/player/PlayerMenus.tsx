import { Menu } from "@base-ui/react/menu"
import { useAtomSet } from "@effect/atom-react"
import { Check, Gauge, Moon } from "lucide-react"
import { playbackAtom } from "../../app/runtime.ts"
import type { NowPlaying, SleepRequest } from "../../playback/Playback.ts"

const speeds = [0.8, 1, 1.2, 1.5, 1.75, 2, 2.5, 3]
const sleepMinutes = [5, 15, 30, 45, 60]

const trigger =
  "inline-flex h-11 items-center gap-2 rounded-full px-4 text-row font-medium text-player-foreground hover:bg-player-track active:bg-player-track/70 data-[popup-open]:bg-player-track"
// Dark, like the player they open from.
const popup =
  "surface-dark min-w-52 rounded-xl border border-player-track bg-player p-1 text-row text-player-foreground shadow-lg outline-none"
const item =
  "flex min-h-10 cursor-default items-center gap-3 rounded-lg px-3 outline-none data-[highlighted]:bg-player-track"

const speedLabel = (speed: number) => `${speed}×`

/** What the sleep timer will do, in a few words. */
export const sleepLabel = (sleep: NowPlaying["sleep"], at = Date.now()) => {
  if (sleep === null) return "Sleep"
  switch (sleep._tag) {
    case "At":
      return `${Math.max(1, Math.ceil((sleep.until - at) / 60_000))} min left`
    case "EndOfEpisode":
      return "End of Episode"
    case "EndOfChapter":
      return "End of Chapter"
  }
}

/** Speed and sleep timer, for the Now Playing drawer and the desktop player bar. */
export function PlayerMenus({ current }: { readonly current: NowPlaying }) {
  const control = useAtomSet(playbackAtom)
  const sleep = (request: SleepRequest | null) => control({ _tag: "setSleep", sleep: request })
  return (
    <div className="flex items-center justify-center gap-2">
      <Menu.Root
        // Opens on the speed that's set, not the list's first (a radio group's checked item).
        onOpenChange={(open) => {
          if (open)
            requestAnimationFrame(() =>
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLElement>('[data-speed-menu] [aria-checked="true"]')
                  ?.focus()
              )
            )
        }}
      >
        <Menu.Trigger className={trigger} aria-label={`Speed: ${speedLabel(current.speed)}`}>
          <Gauge aria-hidden="true" className="size-4" />
          <span className="tabular-nums">{speedLabel(current.speed)}</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="top" sideOffset={8} className="z-[60]">
            <Menu.Popup data-speed-menu="" className={popup}>
              <Menu.RadioGroup
                value={current.speed}
                onValueChange={(speed: number) => control({ _tag: "setSpeed", speed })}
              >
                {speeds.map((s) => (
                  <Menu.RadioItem key={s} value={s} className={item}>
                    <span className="w-4">
                      <Menu.RadioItemIndicator>
                        <Check aria-hidden="true" className="size-4" />
                      </Menu.RadioItemIndicator>
                    </span>
                    <span className="tabular-nums">{speedLabel(s)}</span>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <Menu.Root>
        <Menu.Trigger
          className={trigger}
          aria-label={current.sleep ? `Sleep timer: ${sleepLabel(current.sleep)}` : "Sleep timer"}
        >
          <Moon aria-hidden="true" className={`size-4 ${current.sleep ? "fill-current" : ""}`} />
          {sleepLabel(current.sleep)}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="top" sideOffset={8} className="z-[60]">
            <Menu.Popup className={popup}>
              {sleepMinutes.map((minutes) => (
                <Menu.Item
                  key={minutes}
                  onClick={() => sleep({ _tag: "Minutes", minutes })}
                  className={item}
                >
                  In {minutes} minutes
                </Menu.Item>
              ))}
              {current.chapters.length > 0 && (
                <Menu.Item onClick={() => sleep({ _tag: "EndOfChapter" })} className={item}>
                  At the end of this Chapter
                </Menu.Item>
              )}
              <Menu.Item onClick={() => sleep({ _tag: "EndOfEpisode" })} className={item}>
                At the end of this Episode
              </Menu.Item>
              {current.sleep && (
                <Menu.Item onClick={() => sleep(null)} className={`${item} text-player-danger`}>
                  Turn off
                </Menu.Item>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  )
}
