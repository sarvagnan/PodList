import { Menu } from "@base-ui/react/menu"
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { AlertCircle, ArrowDownToLine, CircleArrowDown, Square } from "lucide-react"
import type * as React from "react"
import type { ReactNode } from "react"
import { downloadAtom, downloadsAtom } from "../../app/runtime.ts"
import type { DownloadStatus } from "../../downloads/Downloads.ts"

/** This Device's download of an Episode: none, in progress, stored, or failed. */
export function useDownloadStatus(episodeId: string): DownloadStatus | undefined {
  return AsyncResult.getOrElse(useAtomValue(downloadsAtom), () => new Map()).get(episodeId)
}

const megabytes = (bytes: number) => `${Math.max(1, Math.round(bytes / 1_000_000))} MB`

/** A ring that fills as a download arrives; indeterminate (spinning) without a size. */
function ProgressRing({ fraction }: { readonly fraction: number | null }) {
  const circumference = 2 * Math.PI * 9
  return (
    <span className="relative grid size-5 place-items-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={`size-5 -rotate-90 ${fraction === null ? "animate-spin" : ""}`}
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="2.5"
        />
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - (fraction ?? 0.25))}
        />
      </svg>
      <Square aria-hidden="true" className="absolute size-2 fill-current" />
    </span>
  )
}

/**
 * Download, stop, or remove an Episode's download on this Device. Removing asks first,
 * from a small menu: offline, a removed download can't be fetched back.
 */
export function DownloadButton({
  episodeId,
  renderButton
}: {
  readonly episodeId: string
  /** Draws the control: an icon-only row button, or a labelled action. */
  readonly renderButton: (props: {
    readonly icon: ReactNode
    readonly label: string
    readonly pressed: boolean
    readonly onClick?: () => void
    /** Menu trigger props (ref, handlers, aria-*) to spread onto the button. */
    readonly buttonProps?: React.ComponentProps<"button">
  }) => ReactNode
}) {
  const status = useDownloadStatus(episodeId)
  const run = useAtomSet(downloadAtom)

  if (status?._tag === "Stored") {
    return (
      <Menu.Root>
        <Menu.Trigger
          render={(props) =>
            renderButton({
              icon: <CircleArrowDown aria-hidden="true" className="size-5" />,
              label: "Downloaded",
              pressed: true,
              buttonProps: props
            }) as React.ReactElement
          }
        />
        <Menu.Portal>
          <Menu.Positioner sideOffset={6} className="z-50">
            <Menu.Popup className="min-w-48 rounded-xl border bg-popover p-1 text-row text-popover-foreground shadow-lg">
              <p className="px-3 py-2 text-small text-muted-foreground">
                Stored on this Device · {megabytes(status.bytes)}
              </p>
              <Menu.Item
                onClick={() => run({ _tag: "remove", episodeId })}
                className="flex min-h-10 cursor-default items-center rounded-lg px-3 text-destructive outline-none data-[highlighted]:bg-secondary"
              >
                Remove download
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    )
  }
  if (status?._tag === "Downloading") {
    const fraction = status.total ? status.received / status.total : null
    return renderButton({
      icon: <ProgressRing fraction={fraction} />,
      label: fraction === null ? "Stop download" : `Stop download (${Math.round(fraction * 100)}%)`,
      pressed: false,
      onClick: () => run({ _tag: "cancel", episodeId })
    })
  }
  if (status?._tag === "Failed") {
    return renderButton({
      icon: <AlertCircle aria-hidden="true" className="size-5 text-destructive" />,
      label: "Download failed. Try again",
      pressed: false,
      onClick: () => run({ _tag: "download", episodeId })
    })
  }
  return renderButton({
    icon: <ArrowDownToLine aria-hidden="true" className="size-5" />,
    label: "Download",
    pressed: false,
    onClick: () => run({ _tag: "download", episodeId })
  })
}
