import { ContextMenu } from "@base-ui/react/context-menu"
import { Check } from "lucide-react"
import { cloneElement, type ReactElement, type ReactNode, useEffect, useId, useRef } from "react"
import { inMacApp } from "../../lib/share.ts"
import { useMinWidth } from "../../lib/useWide.ts"
import { useCopyLink } from "../feedback/useCopyLink.ts"

// A row's right-click menu, described once: a Base UI menu in a desktop browser, a native
// menu in the Mac app (packages/desktop/src/main.ts reads data-row-menu and sends the
// chosen label back as "podlist:row-menu"), and on the phone the browser's own long-press
// menu, which keeps links working.

export type RowCommand =
  | {
      readonly label: string
      readonly run: () => void
      /** A choice that is on or off (shown with a tick). */
      readonly checked?: boolean
    }
  | { readonly separator: true }

export interface RowMenuProps {
  readonly commands: ReadonlyArray<RowCommand>
  /** The row's page in the app: adds Copy Link, a link to the PodList server (and in the
   * Mac app, Open in Browser). No "Open in New Tab": PodList runs in one tab at a time, so
   * a second would only offer to take over. The browser's own menu on a title link still
   * has it. */
  readonly link?: string
  /** The row element; the menu opens from anywhere in it. */
  readonly render: ReactElement<Record<string, unknown>>
  readonly children: ReactNode
}

/** What the Mac app reads for its native menu (data-row-menu). */
export interface NativeRowMenu {
  readonly id: string
  /** The commands, with null for a separator. */
  readonly items: ReadonlyArray<{ readonly label: string; readonly checked?: boolean } | null>
  readonly link?: string
}

const itemClass =
  "flex min-h-10 cursor-default items-center rounded-lg px-3 outline-none data-[highlighted]:bg-secondary"

/** The commands as menu items, for a row's right-click menu or its More menu. */
export function RowMenuItems({
  commands,
  link
}: {
  readonly commands: ReadonlyArray<RowCommand>
  readonly link?: string
}) {
  const copy = useCopyLink()
  const all: ReadonlyArray<RowCommand> =
    link === undefined
      ? commands
      : [...commands, { separator: true }, { label: "Copy Link", run: () => void copy(link) }]
  return all.map((command, index) =>
    "separator" in command ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: separators have no identity of their own.
      <ContextMenu.Separator key={`separator-${index}`} className="my-1 h-px bg-border" />
    ) : command.checked === undefined ? (
      <ContextMenu.Item key={command.label} onClick={command.run} className={itemClass}>
        {command.label}
      </ContextMenu.Item>
    ) : (
      <ContextMenu.CheckboxItem
        key={command.label}
        checked={command.checked}
        onCheckedChange={command.run}
        // A choice made from a right-click menu is the whole errand: the menu goes.
        closeOnClick
        className={`${itemClass} gap-2 pl-2`}
      >
        <span className="grid w-4 place-items-center">
          <ContextMenu.CheckboxItemIndicator>
            <Check aria-hidden="true" className="size-4" />
          </ContextMenu.CheckboxItemIndicator>
        </span>
        {command.label}
      </ContextMenu.CheckboxItem>
    )
  )
}

/**
 * Links, fields and selected text in a row keep the browser's own menu (BROWSER-06): the
 * right-click stops at the row, before the row's menu (which listens further up) sees it.
 */
/** Where focus was when each row's menu was opened, to return it there on close. */
const openedFrom = new WeakMap<HTMLElement, Element | null>()

const keepBrowserMenus = (row: HTMLElement | null) => {
  if (row === null) return
  const onContextMenu = (event: MouseEvent) => {
    openedFrom.set(row, document.activeElement)
    const target = event.target as Element
    const selected = window.getSelection()
    if (
      // Links and text fields have the browser's own commands (open, paste); a select or a
      // checkbox has none worth keeping, so the row's menu opens there.
      target.closest('a[href], textarea, input:not([type="checkbox"], [type="radio"])') ||
      (selected !== null && !selected.isCollapsed && row.contains(selected.anchorNode))
    ) {
      event.stopPropagation()
    }
  }
  row.addEventListener("contextmenu", onContextMenu, { capture: true })
  return () => row.removeEventListener("contextmenu", onContextMenu, { capture: true })
}

export function RowMenu({ commands, link, render, children }: RowMenuProps) {
  const wide = useMinWidth("64rem")
  const id = useId()
  // Closing the menu returns focus to the row (WKEY-03): to what had focus in it, or its
  // title. A row that has gone (Mark Played in an Unplayed View) leaves focus to the list.
  const row = useRef<HTMLElement | null>(null)
  const backToRow = () => {
    const element = row.current
    if (element === null || !element.isConnected) return false
    const before = openedFrom.get(element)
    if (before instanceof HTMLElement && before.isConnected && element.contains(before))
      return before
    return (
      element.querySelector<HTMLElement>("[data-cell=title], a[href]") ??
      element.querySelector<HTMLElement>("button, [tabindex]") ??
      false
    )
  }
  // The Mac app's menu answers with a label; run that command as it is now.
  const current = useRef(commands)
  current.current = commands
  useEffect(() => {
    if (!inMacApp) return
    const onChoose = (event: Event) => {
      const chosen = (event as CustomEvent<{ id: string; label: string }>).detail
      if (chosen.id !== id) return
      for (const command of current.current) {
        if ("label" in command && command.label === chosen.label) command.run()
      }
    }
    document.addEventListener("podlist:row-menu", onChoose)
    return () => document.removeEventListener("podlist:row-menu", onChoose)
  }, [id])

  if (inMacApp) {
    const native: NativeRowMenu = {
      id,
      items: commands.map((c) =>
        "separator" in c
          ? null
          : { label: c.label, ...(c.checked === undefined ? {} : { checked: c.checked }) }
      ),
      ...(link === undefined ? {} : { link })
    }
    return cloneElement(render, { "data-row-menu": JSON.stringify(native) }, children)
  }
  if (!wide) return cloneElement(render, {}, children)
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        ref={(element: HTMLElement | null) => {
          row.current = element
          return keepBrowserMenus(element)
        }}
        render={render}
      >
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="z-50">
          <ContextMenu.Popup
            finalFocus={backToRow}
            className="min-w-56 rounded-xl border bg-popover p-1 text-row text-popover-foreground shadow-lg"
          >
            <RowMenuItems commands={commands} {...(link === undefined ? {} : { link })} />
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
