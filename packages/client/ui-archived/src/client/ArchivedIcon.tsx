/**
 * ArchivedIcon: the sidebar row glyph for the archived-session panel. It
 * paints in `currentColor` so the sidebar owns active/idle colouring.
 */

import type { SidebarPanelIconOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

/**
 * The archived-panel sidebar icon.
 * @param props - the requested square edge in pixels; `active` is the sidebar's own dress.
 */
export function ArchivedIcon({ size }: SidebarPanelIconOwnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.5 3h11l.5 2.5H2L2.5 3Zm.5 3.5h10V13a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 3 13V6.5Zm3 2v1h4v-1H6Z"
        fill="currentColor"
      />
    </svg>
  )
}
