import { Menu } from "@base-ui/react/menu"
import { Ellipsis } from "lucide-react"
import { Tip } from "../feedback/Tip.tsx"
import { type RowCommand, RowMenuItems } from "./RowMenu.tsx"

/**
 * A row's commands behind a ⋯ button: where there is no right-click (a phone) and no room
 * for each command (AX-04). Moving an Entry, as well as dragging it, is one of them, so
 * reordering never needs a drag.
 */
export function MoreMenu({
  commands,
  label,
  link,
  className = "text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-input"
}: {
  readonly commands: ReadonlyArray<RowCommand>
  /** Names the row it acts on: "More actions for <title>". */
  readonly label: string
  readonly link?: string
  readonly className?: string
}) {
  return (
    <Menu.Root>
      <Tip label="More actions">
        <Menu.Trigger
          data-cell=""
          aria-label={`More actions for ${label}`}
          className={`grid size-11 shrink-0 place-items-center rounded-full data-[popup-open]:bg-secondary ${className}`}
        >
          <Ellipsis aria-hidden="true" className="size-5" />
        </Menu.Trigger>
      </Tip>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-[60]">
          <Menu.Popup className="min-w-56 rounded-xl border bg-popover p-1 text-row text-popover-foreground shadow-lg">
            <RowMenuItems commands={commands} {...(link === undefined ? {} : { link })} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
