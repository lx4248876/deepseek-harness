/**
 * ArchivedPanel: the sidebar's archived-session panel body. It reads the
 * registry-global archive set and the session list through the `main`
 * standard hooks and owns exactly one action — copying a session id — plus
 * the empty state. Restoring a session needs host-side support that this
 * deployment does not carry, so the panel states that instead of offering a
 * control that cannot work.
 */

import { useCallback, useMemo, useState } from 'react'
import { writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// Type-only: pulls the ui-conversation GlobalStandardProps merge that supplies useWorkspaces.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ArchivedKey } from './locales.ts'
import css from './ArchivedPanel.module.css'

/** Full props of the sidebar's archived panel: the `main` standard shares plus locale. */
export type ArchivedPanelProps =
  import('@deepseek-ai/dsh-client-ui-slots').PropsRuntime<'main'>
  & PropsLocale<'archived'>

/** One archived row: the session identity plus its stored title when the list knows it. */
interface ArchivedRow {
  readonly id: SessionId
  readonly title: string
}

/** Copy feedback for the row the operator last acted on. */
interface CopyFeedback {
  readonly id: SessionId
  readonly key: ArchivedKey
}

/**
 * The archived-session panel.
 * @param props - the `main` standard shares (session list, workspace snapshot) and locale.
 */
export function ArchivedPanel({ useSessions, useWorkspaces, t }: ArchivedPanelProps) {
  const list = useSessions(state => state)
  const archivedSessionIds = useWorkspaces(state => state.archivedSessionIds)
  const [feedback, setFeedback] = useState<CopyFeedback | null>(null)

  const rows = useMemo<readonly ArchivedRow[]>(
    () => archivedSessionIds.map(id => ({ id, title: list.byId[id]?.title ?? '' })),
    [archivedSessionIds, list],
  )

  const copy = useCallback((id: SessionId) => {
    void writeClipboard(id).then((ok) => {
      setFeedback({ id, key: ok ? 'row.copied' : 'row.copyFailed' })
    })
  }, [])

  return (
    <section className={css.panel} data-archived-panel>
      <header className={css.header}>
        <h2 className={css.title}>{t('panel.title')}</h2>
        {rows.length > 0 && <span className={css.count}>{t('panel.count', { n: rows.length })}</span>}
      </header>
      {rows.length === 0
        ? <p className={css.empty}>{t('panel.empty')}</p>
        : (
          <ul className={css.list}>
            {rows.map(row => (
              <li key={row.id} className={css.row}>
                <span className={css.rowTitle} title={row.id}>{row.title === '' ? row.id : row.title}</span>
                <button
                  type="button"
                  className={css.copy}
                  onClick={() => { copy(row.id) }}
                >
                  {feedback?.id === row.id ? t(feedback.key) : t('row.copy')}
                </button>
              </li>
            ))}
          </ul>
        )}
      <p className={css.notice}>{t('panel.notice')}</p>
    </section>
  )
}
