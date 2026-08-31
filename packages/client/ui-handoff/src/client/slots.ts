/**
 * HandoffButton's injected face. The target 'conversation.input.right' slot
 * is declared and typed by ui-conversation; this package only contributes the
 * entry, so no SlotMap merge lives here. The button state (running, machine
 * phase, subagent) arrives through the slot's owner props; inject carries the
 * single orchestration verb.
 */

import type { HandoffErrorCode } from './handoff.ts'

/** Settled outcome of one handoff run, rendered inline by the button. */
export type HandoffResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: HandoffErrorCode | 'generic'; readonly message: string }

/** Injected business face of the composer-tool-row handoff entry. */
export interface HandoffButtonActions {
  /**
   * Run the handoff pipeline for the entry's session: verify the handoff
   * skill, generate the package, start a new conversation with it, and
   * archive the source session.
   * @returns success when the package reached the new conversation and the
   *   source session was archived; otherwise the failure code and detail.
   */
  onHandoff: () => Promise<HandoffResult>
}
