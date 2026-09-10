/** Handoff orchestration unit tests: pure deps, no cordis machinery. */
import { describe, expect, it, vi } from 'vitest'
import type { SessionEventLikeEntry, SessionEventWindow } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import {
  HandoffError, extractHandoffPackage, runHandoff, type HandoffDeps,
} from '../src/client/handoff.ts'

const sid = (id: string): SessionId => id as SessionId
const wid = (id: string): WorkspaceId => id as WorkspaceId

function event(type: SessionEvent['type'], seq: number, data: unknown): SessionEventLikeEntry {
  return { type: 'event', event: { type, seq, time: seq, data } as SessionEvent }
}

function assistant(seq: number, ...texts: string[]): SessionEventLikeEntry {
  return event('assistant/message', seq, {
    turn: 1,
    step: 1,
    message: { content: texts.map(text => ({ type: 'text', text })) },
  })
}

function turnEnd(seq: number): SessionEventLikeEntry {
  return event('turn/end', seq, { turn: 1, reason: { kind: 'complete' } })
}

describe('extractHandoffPackage', () => {
  it('returns pending until a turn/end after the from-seq arrives', () => {
    expect(extractHandoffPackage([assistant(2, 'draft')], 0)).toEqual({ kind: 'pending' })
  })

  it('returns the last assistant text before the first later turn/end, joining text blocks', () => {
    const entries = [
      assistant(2, 'draft'),
      assistant(3, 'head', 'body'),
      turnEnd(4),
    ]
    expect(extractHandoffPackage(entries, 0)).toEqual({ kind: 'package', text: 'head\nbody' })
  })

  it('ignores events at or before the from-seq', () => {
    const entries = [
      assistant(1, 'stale'),
      assistant(2, 'fresh'),
      turnEnd(3),
    ]
    expect(extractHandoffPackage(entries, 1)).toEqual({ kind: 'package', text: 'fresh' })
  })

  it('reports an empty package when the turn ends without assistant text after the from-seq', () => {
    expect(extractHandoffPackage([turnEnd(4)], 0)).toEqual({ kind: 'package', text: '' })
  })
})

interface Bench {
  deps: HandoffDeps & {
    listSkills: ReturnType<typeof vi.fn<HandoffDeps['listSkills']>>
    prompt: ReturnType<typeof vi.fn<HandoffDeps['prompt']>>
    subscribeEvents: ReturnType<typeof vi.fn<HandoffDeps['subscribeEvents']>>
    eventWindow: ReturnType<typeof vi.fn<HandoffDeps['eventWindow']>>
    createSession: ReturnType<typeof vi.fn<HandoffDeps['createSession']>>
    titleOf: ReturnType<typeof vi.fn<HandoffDeps['titleOf']>>
    renameSession: ReturnType<typeof vi.fn<HandoffDeps['renameSession']>>
    openSession: ReturnType<typeof vi.fn<HandoffDeps['openSession']>>
    archiveSession: ReturnType<typeof vi.fn<HandoffDeps['archiveSession']>>
    workspaceOf: ReturnType<typeof vi.fn<HandoffDeps['workspaceOf']>>
  }
  calls: string[]
  unsubscribed: number
  replace(entries: readonly SessionEventLikeEntry[]): void
  emit(): void
}

function bench(): Bench {
  const calls: string[] = []
  const listeners = new Set<() => void>()
  let unsubscribed = 0
  let entries: readonly SessionEventLikeEntry[] = []
  const deps = {
    listSkills: vi.fn<HandoffDeps['listSkills']>(async () => [{ name: 'handoff' }]),
    prompt: vi.fn<HandoffDeps['prompt']>(async (sessionId) => { calls.push(`prompt:${sessionId}`) }),
    subscribeEvents: vi.fn<HandoffDeps['subscribeEvents']>((_sessionId, listener) => {
      calls.push('subscribe')
      listeners.add(listener)
      return () => {
        unsubscribed += 1
        listeners.delete(listener)
      }
    }),
    eventWindow: vi.fn<HandoffDeps['eventWindow']>((): SessionEventWindow => ({
      entries,
      hasMore: false,
      revision: 1,
      change: { kind: 'replace', entries },
    })),
    createSession: vi.fn<HandoffDeps['createSession']>(async (workspaceId) => {
      calls.push(`create:${workspaceId ?? 'none'}`)
      return sid('new')
    }),
    titleOf: vi.fn<HandoffDeps['titleOf']>(() => undefined),
    renameSession: vi.fn<HandoffDeps['renameSession']>(async (sessionId) => { calls.push(`rename:${sessionId}`) }),
    openSession: vi.fn<HandoffDeps['openSession']>((sessionId) => { calls.push(`open:${sessionId}`) }),
    archiveSession: vi.fn<HandoffDeps['archiveSession']>(async (sessionId) => { calls.push(`archive:${sessionId}`) }),
    workspaceOf: vi.fn<HandoffDeps['workspaceOf']>(() => wid('ws')),
  } satisfies HandoffDeps
  return {
    deps,
    calls,
    get unsubscribed() { return unsubscribed },
    replace(next) { entries = next },
    emit() { for (const listener of [...listeners]) listener() },
  }
}

describe('runHandoff', () => {
  it('extracts the final assistant text, continues it in a new session, then archives the source', async () => {
    const b = bench()
    const pending = runHandoff(b.deps, sid('old'), '请生成交接包')
    await vi.waitFor(() => { expect(b.deps.prompt).toHaveBeenCalledWith(sid('old'), '请生成交接包') })

    b.replace([assistant(2, 'head', 'body'), turnEnd(3)])
    b.emit()

    await expect(pending).resolves.toBe(sid('new'))
    expect(b.calls).toEqual(['subscribe', 'prompt:old', 'create:ws', 'open:new', 'prompt:new', 'archive:old'])
    expect(b.deps.prompt).toHaveBeenLastCalledWith(sid('new'), 'head\nbody')
    expect(b.unsubscribed).toBe(1)
  })

  it('passes the source workspace to session creation and tolerates an unowned source', async () => {
    const b = bench()
    b.deps.workspaceOf.mockReturnValue(undefined)
    const pending = runHandoff(b.deps, sid('old'), 'p')
    await vi.waitFor(() => { expect(b.deps.prompt).toHaveBeenCalled() })
    b.replace([assistant(2, 'pkg'), turnEnd(3)])
    b.emit()
    await pending
    expect(b.calls).toContain('create:none')
  })

  it('carries the source title to the new session before opening it', async () => {
    const b = bench()
    b.deps.titleOf.mockReturnValue('旧会话名')
    const pending = runHandoff(b.deps, sid('old'), 'p')
    await vi.waitFor(() => { expect(b.deps.prompt).toHaveBeenCalled() })
    b.replace([assistant(2, 'pkg'), turnEnd(3)])
    b.emit()
    await expect(pending).resolves.toBe(sid('new'))
    expect(b.deps.renameSession).toHaveBeenCalledWith(sid('new'), '旧会话名')
    expect(b.calls).toEqual(['subscribe', 'prompt:old', 'create:ws', 'rename:new', 'open:new', 'prompt:new', 'archive:old'])
  })

  it('skips the title carry when the source has no durable title', async () => {
    const b = bench()
    const pending = runHandoff(b.deps, sid('old'), 'p')
    await vi.waitFor(() => { expect(b.deps.prompt).toHaveBeenCalled() })
    b.replace([assistant(2, 'pkg'), turnEnd(3)])
    b.emit()
    await pending
    expect(b.deps.renameSession).not.toHaveBeenCalled()
    expect(b.calls).toEqual(['subscribe', 'prompt:old', 'create:ws', 'open:new', 'prompt:new', 'archive:old'])
  })

  it('rejects with skill-missing before touching the session when the skill is absent', async () => {
    const b = bench()
    b.deps.listSkills.mockResolvedValue([])
    await expect(runHandoff(b.deps, sid('old'), 'p')).rejects.toMatchObject({ code: 'skill-missing' })
    expect(b.deps.prompt).not.toHaveBeenCalled()
    expect(b.calls).not.toContain('subscribe')
  })

  it('rejects with no-package and never archives when the turn ends without assistant text', async () => {
    const b = bench()
    const pending = runHandoff(b.deps, sid('old'), 'p')
    await vi.waitFor(() => { expect(b.deps.prompt).toHaveBeenCalled() })
    b.replace([turnEnd(3)])
    b.emit()
    await expect(pending).rejects.toMatchObject({ code: 'no-package' })
    expect(b.calls).not.toContain('archive:old')
  })

  it('rejects with prompt-rejected and removes the event subscription when the prompt fails', async () => {
    const b = bench()
    b.deps.prompt.mockRejectedValue(new Error('busy'))
    await expect(runHandoff(b.deps, sid('old'), 'p')).rejects.toMatchObject({ code: 'prompt-rejected' })
    expect(b.unsubscribed).toBe(1)
    expect(b.calls).not.toContain('create:ws')
  })

  it('rejects with create-failed and does not open or archive', async () => {
    const b = bench()
    b.deps.createSession.mockRejectedValue(new Error('create failed'))
    const pending = runHandoff(b.deps, sid('old'), 'p')
    await vi.waitFor(() => { expect(b.deps.prompt).toHaveBeenCalled() })
    b.replace([assistant(2, 'pkg'), turnEnd(3)])
    b.emit()
    await expect(pending).rejects.toMatchObject({ code: 'create-failed' })
    expect(b.calls).not.toContain('open:new')
    expect(b.calls).not.toContain('archive:old')
  })

  it('rejects with send-failed and never archives when continuing in the new session fails', async () => {
    const b = bench()
    b.deps.prompt.mockImplementation((sessionId: SessionId) =>
      sessionId === sid('new') ? Promise.reject(new Error('send failed')) : Promise.resolve())
    const pending = runHandoff(b.deps, sid('old'), 'p')
    await vi.waitFor(() => { expect(b.deps.prompt).toHaveBeenCalledWith(sid('old'), 'p') })
    b.replace([assistant(2, 'pkg'), turnEnd(3)])
    b.emit()
    await expect(pending).rejects.toMatchObject({ code: 'send-failed' })
    expect(b.calls).not.toContain('archive:old')
  })

  it('rejects with archive-failed after the package already reached the new session', async () => {
    const b = bench()
    b.deps.archiveSession.mockRejectedValue(new Error('archive failed'))
    const pending = runHandoff(b.deps, sid('old'), 'p')
    await vi.waitFor(() => { expect(b.deps.prompt).toHaveBeenCalledWith(sid('old'), 'p') })
    b.replace([assistant(2, 'pkg'), turnEnd(3)])
    b.emit()
    await expect(pending).rejects.toMatchObject({ code: 'archive-failed' })
    expect(b.deps.prompt).toHaveBeenLastCalledWith(sid('new'), 'pkg')
  })

  it('wraps a non-Handoff failure with a stable code', async () => {
    const b = bench()
    b.deps.prompt.mockRejectedValue(new Error('raw'))
    await expect(runHandoff(b.deps, sid('old'), 'p')).rejects.toBeInstanceOf(HandoffError)
  })
})
