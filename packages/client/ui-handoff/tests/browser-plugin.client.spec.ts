// @vitest-environment jsdom
/**
 * ui-handoff browser half on the SlotTestRuntime: the plugin registers the
 * handoff entry at conversation.input.right, the injected verb runs the full
 * pipeline over the fixture sessions (skill check → prompt → event-driven
 * package extraction → new session → archive), and registration disposal
 * rides the plugin fiber (HMR safety). The node half is exercised over the
 * same runtime.
 */
import { Service, type Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { afterEach } from 'vitest'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { RemoteError, SlotTestRuntime, type SessionBehaviorOverrides } from '@deepseek-ai/dsh-client-test-runtime'
import type { SessionEventLikeEntry } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import type { SessionFace } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId, SessionSeq } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import { apply, inject } from '../src/client/index.ts'
import type { HandoffButtonActions } from '../src/client/slots.ts'
import { apply as nodeApply } from '../src/index.ts'

const sid = (id: string): SessionId => id as SessionId
const wid = (id: string): WorkspaceId => id as WorkspaceId

function event(type: SessionEvent['type'], seq: number, data: unknown): SessionEventLikeEntry {
  return { type: 'event', event: { type, seq, time: seq, data } as SessionEvent }
}

function assistant(seq: number, text: string): SessionEventLikeEntry {
  return event('assistant/message', seq, {
    turn: 1,
    step: 1,
    message: { content: [{ type: 'text', text }] },
  })
}

function turnEnd(seq: number): SessionEventLikeEntry {
  return event('turn/end', seq, { turn: 1, reason: { kind: 'complete' } })
}

const runtimes: SlotTestRuntime[] = []
afterEach(async () => {
  for (const runtime of runtimes.splice(0)) await runtime.dispose()
})

async function bench(options: { skills?: string[]; sourceTitle?: string; rename?: SessionBehaviorOverrides['rename'] } = {}) {
  const runtime = await SlotTestRuntime.create()
  runtimes.push(runtime)
  const prompts: { sessionId: SessionId; text: string }[] = []
  const archived: SessionId[] = []
  const renames: { sessionId: SessionId; title: string }[] = []
  const promptStub = async (content: Parameters<SessionFace['prompt']>[0], _mode: 'queue' | 'steer') => {
    const text = content.map(part => part.type === 'text' ? part.text : '').join('')
    prompts.push({ sessionId: runtime.sessions.list.getSnapshot().current as SessionId, text })
    return Promise.resolve({ ok: true as const, value: { accepted: true as const } })
  }
  await runtime.sessions.add({
    id: 'old',
    ...(options.sourceTitle === undefined ? {} : { summary: { title: options.sourceTitle } }),
    session: { prompt: promptStub },
  })
  const renameStub = options.rename ?? (async (title: string) => {
    renames.push({ sessionId: sid('new'), title })
    return { ok: true as const, value: { title, seq: 1 as SessionSeq } }
  })
  runtime.sessions.stubCreate(async () => {
    return await runtime.sessions.add({ id: 'new', session: { prompt: promptStub, rename: renameStub } })
  })
  await runtime.workspaces.update((draft) => {
    draft.items = [{
      workspaceId: wid('ws'), path: '/w', title: 'w', sessionIds: [sid('old')],
      createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z',
    }]
  })
  runtime.ctx.provide('uiWorkspace', { archiveSession: async (sessionId: SessionId) => { archived.push(sessionId) } })
  class RemoteService extends Service {
    constructor(serviceCtx: Context) {
      super(serviceCtx, 'remote')
    }
  }
  new RemoteService(runtime.ctx)
  const skills = options.skills ?? ['handoff']
  runtime.ctx.provide('remote.skills', {
    list: vi.fn(async () => ({
      ok: true as const,
      value: { skills: skills.map(name => ({ name, description: '', modelInvocable: true })) },
    })),
  })
  runtime.ctx.provide('locale', new LocaleRuntime(runtime.ctx))
  await runtime.root.declare({ 'conversation.input.right': { kind: 'list', scope: 'session' } }, (() => null) as never)
  const handle = await runtime.mount({ inject, apply })
  return {
    runtime,
    handle,
    prompts,
    archived,
    renames,
    entry: () => {
      const entry = runtime.slots.entries('conversation.input.right')[0]
      if (entry === undefined) return undefined
      return {
        ...entry.options,
        locale: entry.locale,
        inject: entry.inject as unknown as ((sessionId: SessionId) => HandoffButtonActions) | undefined,
      }
    },
    verbs: () => runtime.slots.entries('conversation.input.right')[0]?.inject as unknown as ((sessionId: SessionId) => HandoffButtonActions) | undefined,
  }
}

describe('ui-handoff browser plugin', () => {
  it('registers the handoff entry in conversation.input.right and drops it on dispose (HMR safety)', async () => {
    const b = await bench()
    expect(b.entry()).toMatchObject({ id: 'handoff', locale: 'handoff' })
    expect(b.verbs()).toBeTypeOf('function')
    await b.handle.dispose()
    expect(b.entry()).toBeUndefined()
  })

  it('runs the full pipeline: prompts the source, continues the package in a new session, archives', async () => {
    const b = await bench({ sourceTitle: '源会话名' })
    const verbs = b.verbs()!
    const pending = verbs(sid('old')).onHandoff()
    // The skill check and source prompt run synchronously enough; the turn
    // arrives through the fixture event window after the prompt is admitted.
    await vi.waitFor(() => { expect(b.prompts.length).toBe(1) })
    // The source prompt must keep the `/handoff` gesture terminal so the host
    // skill boundary recognizes it (word-boundary grammar).
    expect(b.prompts[0]?.text.endsWith('/handoff')).toBe(true)
    b.prompts.splice(0)
    await b.runtime.sessions.replaceEvents(sid('old'), [assistant(2, '# 交接包'), turnEnd(3)])
    const result = await pending
    expect(result).toEqual({ ok: true })
    expect(b.prompts).toEqual([
      { sessionId: sid('new'), text: '# 交接包' },
    ])
    expect(b.renames).toEqual([{ sessionId: sid('new'), title: '源会话名' }])
    expect(b.archived).toEqual([sid('old')])
    expect(b.runtime.sessions.list.getSnapshot().current).toBe(sid('new'))
  })

  it('skips the title carry when the source has no durable title', async () => {
    const b = await bench()
    const pending = b.verbs()!(sid('old')).onHandoff()
    await vi.waitFor(() => { expect(b.prompts.length).toBe(1) })
    b.prompts.splice(0)
    await b.runtime.sessions.replaceEvents(sid('old'), [assistant(2, '# 交接包'), turnEnd(3)])
    await pending
    expect(b.renames).toEqual([])
  })

  it('continues the handoff when the host rejects the title carry', async () => {
    const b = await bench({
      sourceTitle: '源会话名',
      rename: async () => ({
        ok: false as const,
        error: new RemoteError('session/title-invalid', 'rejected', { sessionId: sid('new') }),
      }),
    })
    const pending = b.verbs()!(sid('old')).onHandoff()
    await vi.waitFor(() => { expect(b.prompts.length).toBe(1) })
    b.prompts.splice(0)
    await b.runtime.sessions.replaceEvents(sid('old'), [assistant(2, '# 交接包'), turnEnd(3)])
    await expect(pending).resolves.toEqual({ ok: true })
    expect(b.prompts).toEqual([{ sessionId: sid('new'), text: '# 交接包' }])
    expect(b.archived).toEqual([sid('old')])
  })

  it('continues the handoff when the title carry transport fails', async () => {
    const b = await bench({
      sourceTitle: '源会话名',
      rename: async () => { throw new Error('transport down') },
    })
    const pending = b.verbs()!(sid('old')).onHandoff()
    await vi.waitFor(() => { expect(b.prompts.length).toBe(1) })
    b.prompts.splice(0)
    await b.runtime.sessions.replaceEvents(sid('old'), [assistant(2, '# 交接包'), turnEnd(3)])
    await expect(pending).resolves.toEqual({ ok: true })
    expect(b.archived).toEqual([sid('old')])
  })

  it('returns skill-missing without prompting when the catalog lacks the handoff skill', async () => {
    const b = await bench({ skills: [] })
    const result = await b.verbs()!(sid('old')).onHandoff()
    expect(result).toMatchObject({ ok: false, code: 'skill-missing' })
    expect(b.prompts).toHaveLength(0)
    expect(b.archived).toHaveLength(0)
  })
})

describe('ui-handoff node half', () => {
  it('the node apply is an inert loader seat', () => {
    expect(() => { nodeApply() }).not.toThrow()
  })
})
