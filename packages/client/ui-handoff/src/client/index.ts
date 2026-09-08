/**
 * Handoff composer action plugin, browser half: the handoff entry in the
 * conversation composer tool row (`conversation.input.right`). The inject
 * face carries one verb that runs the whole pipeline — catalog check,
 * `/handoff` prompt, event-driven package extraction, new-session handoff,
 * source archive — against the real session/workspace faces; the component
 * owns only pending/error presentation.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// Type-only: pulls the generated Remote API and ctx.remote merge through the Client assembly boundary.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the Session Controller service merge (ctx.sessions).
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
// Type-only: pulls the Workspace Controller service merge (ctx.workspaces).
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the Conversation composer-tool-row slot declaration.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the renderer-owned slots service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the Session standard-kit merge.
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
// Type-only: pulls the Workspace UI service merge (ctx.uiWorkspace).
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { HandoffButtonActions, HandoffResult } from './slots.ts'
import { HandoffButton } from './HandoffButton.tsx'
import { en, zh, type HandoffKey } from './locales.ts'
import { HandoffError, runHandoff, type HandoffDeps } from './handoff.ts'

export type { HandoffButtonActions, HandoffResult } from './slots.ts'
export type { HandoffKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The composer handoff action copy. */
    handoff: HandoffKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'handoff'

/** Required services: slots plus the Session/Workspace/Remote faces the pipeline needs. */
export const inject = ['slots', 'sessions', 'workspaces', 'uiWorkspace', 'locale', 'remote', 'remote.skills']

/**
 * Client plugin body: the composer-tool-row handoff action.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-handoff: dictionaries')
  const t = ctx.locale.bind(NS)
  const sessions = ctx.sessions
  const workspaces = ctx.workspaces
  const uiWorkspace = ctx.uiWorkspace
  const skills = ctx.remote.skills

  const deps: HandoffDeps = {
    listSkills: async (sessionId) => {
      const result = await skills.list({ sessionId })
      return result.ok ? result.value.skills : []
    },
    prompt: async (sessionId, text) => {
      const session = sessions.binding(sessionId)?.session
      if (session === undefined) throw new Error(`unknown session "${sessionId}"`)
      const result = await session.prompt([{ type: 'text', text }], 'queue')
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
    },
    subscribeEvents: (sessionId, listener) => {
      const binding = sessions.binding(sessionId)
      if (binding === undefined) throw new Error(`unknown session "${sessionId}"`)
      return binding.eventSource.subscribe(listener)
    },
    eventWindow: (sessionId) => {
      const binding = sessions.binding(sessionId)
      if (binding === undefined) throw new Error(`unknown session "${sessionId}"`)
      return binding.eventSource.getSnapshot()
    },
    createSession: workspaceId =>
      sessions.create(workspaceId === undefined ? undefined : { workspaceId }),
    titleOf: sessionId => sessions.list.getSnapshot().byId[sessionId]?.title,
    renameSession: async (sessionId, title) => {
      const session = sessions.binding(sessionId)?.session
      /* v8 ignore next 1 -- createSession's resolution guarantee makes the new session addressable */
      if (session === undefined) return
      try {
        const result = await session.rename(title)
        if (!result.ok) {
          ctx.logger.warn(`ui-handoff: title carry failed: ${result.error.code}: ${result.error.message}`)
        }
      } catch (error) {
        ctx.logger.warn(`ui-handoff: title carry failed: ${String(error)}`)
      }
    },
    openSession: (sessionId) => { sessions.open(sessionId) },
    archiveSession: async (sessionId) => { await uiWorkspace.archiveSession(sessionId) },
    workspaceOf: sessionId => workspaces.list.getSnapshot().items
      .find(workspace => workspace.sessionIds.includes(sessionId))?.workspaceId,
  }

  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'handoff',
    order: 90,
    locale: NS,
    inject: (sessionId: SessionId): HandoffButtonActions => ({
      onHandoff: async (): Promise<HandoffResult> => {
        try {
          await runHandoff(deps, sessionId, t('prompt'))
          return { ok: true }
        } catch (error) {
          if (error instanceof HandoffError) {
            return { ok: false, code: error.code, message: error.message }
          }
          return { ok: false, code: 'generic', message: String(error) }
        }
      },
    }),
  }, HandoffButton))
}
