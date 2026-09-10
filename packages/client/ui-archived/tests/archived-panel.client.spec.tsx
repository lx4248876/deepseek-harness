// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { ArchivedPanel, type ArchivedPanelProps } from '../src/client/ArchivedPanel.tsx'
import { ArchivedIcon } from '../src/client/ArchivedIcon.tsx'
import { zh } from '../src/client/locales.ts'

const writeClipboard = vi.fn(async (_text: string): Promise<boolean> => true)
vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  writeClipboard: (text: string): Promise<boolean> => writeClipboard(text),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  writeClipboard.mockResolvedValue(true)
})

const TITLED = 'session-titled' as SessionId
const UNTITLED = 'session-untitled' as SessionId
const t: ArchivedPanelProps['t'] = makeTranslate(zh)

/** Render the panel with the two standard hooks reduced to fixed snapshots. */
function bench(archivedSessionIds: readonly SessionId[], titles: Record<string, string>): void {
  const list = {
    ids: [...archivedSessionIds],
    byId: Object.fromEntries(Object.entries(titles).map(([id, title]) => [id, { title }])),
  } as unknown as SessionListState
  const workspaces = { archivedSessionIds } as unknown as WorkspaceSnapshot
  const props = {
    useSessions: <T,>(select: (snapshot: SessionListState) => T): T => select(list),
    useWorkspaces: <T,>(select: (snapshot: WorkspaceSnapshot) => T): T => select(workspaces),
    t,
  } as unknown as ArchivedPanelProps
  render(<ArchivedPanel {...props} />)
}

describe('archived panel', () => {
  it('paints the sidebar glyph at the requested edge in currentColor', () => {
    const { container } = render(<ArchivedIcon size={16} active={false} />)

    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('16')
    expect(svg?.getAttribute('height')).toBe('16')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('path')?.getAttribute('fill')).toBe('currentColor')
  })
  it('lists the archive set with stored titles and falls back to the id', () => {
    bench([TITLED, UNTITLED], { [TITLED]: '了解项目' })

    expect(screen.getByText('了解项目')).toBeDefined()
    // A session the list carries no title for renders its id instead.
    expect(screen.getByText(UNTITLED)).toBeDefined()
    expect(screen.getByText('2 个会话')).toBeDefined()
  })

  it('shows the empty state when nothing is archived', () => {
    bench([], {})

    expect(screen.getByText('暂无已归档会话')).toBeDefined()
    expect(screen.queryByRole('button', { name: '复制会话 ID' })).toBeNull()
  })

  it('reports a successful copy on the acted row only', async () => {
    bench([TITLED, UNTITLED], { [TITLED]: '了解项目' })

    fireEvent.click(screen.getAllByRole('button', { name: '复制会话 ID' })[0]!)

    await waitFor(() => { expect(screen.getByRole('button', { name: '已复制' })).toBeDefined() })
    expect(writeClipboard).toHaveBeenCalledWith(TITLED)
    expect(screen.getAllByRole('button', { name: '复制会话 ID' })).toHaveLength(1)
  })

  it('never claims success when the host rejects the write', async () => {
    writeClipboard.mockResolvedValue(false)
    bench([TITLED], { [TITLED]: '了解项目' })

    fireEvent.click(screen.getByRole('button', { name: '复制会话 ID' }))

    await waitFor(() => { expect(screen.getByRole('button', { name: '复制失败' })).toBeDefined() })
    expect(screen.queryByRole('button', { name: '已复制' })).toBeNull()
  })
})
