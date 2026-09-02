// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import { HandoffButton, type HandoffButtonProps } from '../src/client/HandoffButton.tsx'
import type { HandoffResult } from '../src/client/slots.ts'
import type { HandoffErrorCode } from '../src/client/handoff.ts'
import { zh } from '../src/client/locales.ts'

const t = makeTranslate(zh, commonZh)

afterEach(cleanup)

const idleSession = {
  sessionId: 's',
  queue: [],
  pendingSubmissions: [],
  running: false,
  subagent: null,
  removed: false,
  openState: 'open',
  openError: null,
  hasMore: false,
  loadingOlder: false,
  promptError: null,
  blank: false,
  lastAgentError: null,
  promptAttempted: false,
  awaitingFirstTurn: false,
} as unknown as SessionSnapshot

function sessionHook(session: SessionSnapshot): HandoffButtonProps['useSession'] {
  return selector => selector(session)
}

function makeProps(overrides: Partial<HandoffButtonProps> = {}): HandoffButtonProps {
  return {
    sessionId: 's',
    useSession: sessionHook(idleSession),
    t,
    onHandoff: vi.fn(async () => ({ ok: true })),
    ...overrides,
  } as unknown as HandoffButtonProps
}

describe('HandoffButton', () => {
  it('renders the handoff control and runs the injected verb on click', async () => {
    const onHandoff = vi.fn<HandoffButtonProps['onHandoff']>(async () => ({ ok: true }))
    render(<HandoffButton {...makeProps({ onHandoff })} />)
    expect(screen.getByRole('button', { name: '交接' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '交接' }))
    expect(onHandoff).toHaveBeenCalledTimes(1)
  })

  it('single-flights clicks and shows the pending label while running', async () => {
    const onHandoff = vi.fn(() => new Promise<HandoffResult>(() => {}))
    render(<HandoffButton {...makeProps({ onHandoff })} />)
    const button = screen.getByRole<HTMLButtonElement>('button', { name: '交接' })
    act(() => {
      button.click()
      button.click()
    })
    expect(onHandoff).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '生成中' })).toBeTruthy()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '生成中' }).disabled).toBe(true)
  })

  it('stays disabled while the session runs, hosts a subagent, is removed, or a submission is in flight', () => {
    for (const session of [
      { ...idleSession, running: true },
      { ...idleSession, subagent: { address: {} } },
      { ...idleSession, removed: true },
    ] as SessionSnapshot[]) {
      const { unmount } = render(<HandoffButton {...makeProps({ useSession: sessionHook(session) })} />)
      expect(screen.getByRole<HTMLButtonElement>('button', { name: '交接' }).disabled).toBe(true)
      unmount()
    }
    const submitting = {
      ...idleSession,
      pendingSubmissions: [{ key: 'k', kind: 'prompt', sessionId: 's' }],
    } as unknown as SessionSnapshot
    const busy = render(<HandoffButton {...makeProps({ useSession: sessionHook(submitting) })} />)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '交接' }).disabled).toBe(true)
    busy.unmount()
  })

  it('maps known failure codes to localized error copy', async () => {
    const cases: { code: HandoffErrorCode | 'generic'; text: string }[] = [
      { code: 'skill-missing', text: '未找到 handoff 技能，请先安装到技能目录。' },
      { code: 'no-package', text: '未能生成交接包，未归档当前会话。' },
      { code: 'generic', text: '交接失败，未归档当前会话。' },
      { code: 'archive-failed', text: '交接失败，未归档当前会话。' },
    ]
    for (const { code, text } of cases) {
      const onHandoff = vi.fn<HandoffButtonProps['onHandoff']>(async () => ({ ok: false, code, message: 'x' }))
      const { unmount } = render(<HandoffButton {...makeProps({ onHandoff })} />)
      fireEvent.click(screen.getByRole('button', { name: '交接' }))
      expect((await screen.findByRole('alert')).textContent).toBe(text)
      unmount()
    }
  })
})
