/**
 * HandoffButton: the composer-tool-row handoff action. The button owns only
 * pending/error presentation; the whole pipeline (skill check, package
 * generation, new conversation, archive) runs through the injected verb.
 * Disable state derives from the slot owner props: an idle, non-subagent
 * session is the only safe source for a handoff.
 */

import { useCallback, useRef, useState } from 'react'
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { HandoffButtonActions } from './slots.ts'
import type { HandoffKey } from './locales.ts'
import css from './HandoffButton.module.css'

/** Full props of the composer-tool-row handoff entry. */
export type HandoffButtonProps =
  import('@deepseek-ai/dsh-client-ui-slots').PropsRuntime<'conversation.input.right'>
  & HandoffButtonActions
  & PropsLocale<'handoff'>

/** Map one pipeline failure identity to localized copy. */
function errorKey(code: HandoffButtonActions['onHandoff'] extends () => Promise<infer R>
  ? R extends { readonly ok: false; readonly code: infer C } ? C : never
  : never): HandoffKey {
  switch (code) {
    case 'skill-missing':
      return 'error.skillMissing'
    case 'no-package':
      return 'error.noPackage'
    default:
      return 'error.failed'
  }
}

/**
 * The composer-tool-row handoff action.
 * @param props - owner session/input state, the injected verb, and locale.
 */
export function HandoffButton({ session, input, onHandoff, t }: HandoffButtonProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<HandoffKey | null>(null)
  const pendingRef = useRef(false)

  const machineBusy = input.phase === 'submitting' || input.phase === 'adjudicating'
  const disabled = pending || session.removed || session.running || session.subagent !== null || machineBusy

  const run = useCallback(async () => {
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError(null)
    const result = await onHandoff()
    pendingRef.current = false
    setPending(false)
    if (!result.ok) setError(errorKey(result.code))
  }, [onHandoff])

  const label = pending ? t('button.pending') : t('button.label')
  return (
    <div className={css.root} data-handoff-button>
      {error !== null && <span className={css.error} role="alert">{t(error)}</span>}
      <Tooltip label={t('button.label')} side="top" delayMs={500}>
        <button
          type="button"
          className={css.button}
          aria-label={label}
          disabled={disabled}
          onClick={() => { void run() }}
        >
          {label}
        </button>
      </Tooltip>
    </div>
  )
}
