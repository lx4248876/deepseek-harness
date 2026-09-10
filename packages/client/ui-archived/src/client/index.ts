/**
 * Archived-session panel plugin, browser half: one `main` panel plus the
 * sidebar icon row that selects it. The panel body owns the archived list and
 * the copy-session-id action; it registers no host surface of its own.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the layout service merge and the `main` panel key type.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
// Type-only: pulls the renderer-owned slots service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the Session root standard-props merge.
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
// Type-only: pulls the sidebar panel slot declaration and its icon props.
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
// Type-only: pulls the Workspace Controller service merge (ctx.workspaces).
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
// Type-only: pulls the Session Controller service merge (ctx.sessions).
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import { ArchivedIcon } from './ArchivedIcon.tsx'
import { ArchivedPanel } from './ArchivedPanel.tsx'
import { en, zh, type ArchivedKey } from './locales.ts'

export type { ArchivedPanelProps } from './ArchivedPanel.tsx'
export type { ArchivedKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The archived-session panel copy. */
    archived: ArchivedKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'archived'

/**
 * The panel id. It addresses the `main` cell and the matching sidebar row;
 * the layout reserves only `conversation`, so this key is this panel's alone.
 */
const PANEL_ID = 'archived'

/** Sidebar row order: after the Conversation row and before the settings foot. */
const PANEL_ORDER = 60

/** Required services: the slot registry and the locale registry. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: the archived-session panel and its sidebar row.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-archived: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
    locale: NS,
  }, ArchivedPanel))

  // The label is a thunk so the sidebar re-projects it when the locale moves.
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: PANEL_ORDER,
    label: () => t('panel.title'),
  }, ArchivedIcon))
}
