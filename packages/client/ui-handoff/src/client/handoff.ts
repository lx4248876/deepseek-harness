/**
 * Handoff orchestration: drive the `/handoff` skill in the source Session,
 * capture the generated package from the closing assistant message, continue
 * it as the first message of a new Session, then archive the source Session.
 *
 * The module is pure over the injected faces so the pipeline is unit-testable
 * without cordis; the browser plugin supplies the real faces in `client/index.ts`.
 */
import type { SessionEventLikeEntry, SessionEventWindow } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ContentBlock } from '@deepseek-ai/dsh-llm/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'

/** The skill name the composer action requires in the session catalog. */
export const HANDOFF_SKILL_NAME = 'handoff'

/** Stable failure identities the button maps to localized copy. */
export type HandoffErrorCode =
  | 'skill-missing'
  | 'no-package'
  | 'prompt-rejected'
  | 'create-failed'
  | 'send-failed'
  | 'archive-failed'

/** One handoff pipeline failure with a stable `code` for the UI. */
export class HandoffError extends Error {
  override readonly name = 'HandoffError'

  /**
   * @param code - stable failure identity.
   * @param message - developer-facing detail.
   */
  constructor(readonly code: HandoffErrorCode, message: string) {
    super(message)
  }
}

/** Session and workspace operations the pipeline needs, injected by the plugin. */
export interface HandoffDeps {
  /** List the session's skill catalog (the host resolves cwd from the session). */
  listSkills(sessionId: SessionId): Promise<readonly { readonly name: string }[]>
  /** Send one plain-text prompt into a session (queue delivery). */
  prompt(sessionId: SessionId, text: string): Promise<void>
  /** Subscribe to a session's durable event window. */
  subscribeEvents(sessionId: SessionId, listener: () => void): () => void
  /** Read the session's current contiguous event window. */
  eventWindow(sessionId: SessionId): SessionEventWindow
  /** Create a Session, optionally inside a Workspace. */
  createSession(workspaceId: WorkspaceId | undefined): Promise<SessionId>
  /** Select a Session as current. */
  openSession(sessionId: SessionId): void
  /** Archive a Session. */
  archiveSession(sessionId: SessionId): Promise<void>
  /** Workspace owning a Session, or undefined when the session is ungrouped. */
  workspaceOf(sessionId: SessionId): WorkspaceId | undefined
}

/** One extraction read of the event window. */
export type HandoffExtraction =
  | { readonly kind: 'pending' }
  | { readonly kind: 'package'; readonly text: string }

/**
 * Project the handoff package from events after `fromSeq`: the last
 * `assistant/message` text before the first later `turn/end`. A window without
 * such a turn/end is still pending; a turn that ends with no assistant text is
 * a done-but-empty package.
 * @param entries - event window entries in sequence order.
 * @param fromSeq - ignore events at or before this sequence number.
 * @returns the extraction state.
 */
export function extractHandoffPackage(
  entries: readonly SessionEventLikeEntry[],
  fromSeq: number,
): HandoffExtraction {
  let text: string | undefined
  for (const entry of entries) {
    if (entry.type !== 'event') continue
    const event = entry.event
    if (event.seq <= fromSeq) continue
    if (event.type === 'assistant/message') {
      text = textContent(event.data.message.content)
    } else if (event.type === 'turn/end') {
      return { kind: 'package', text: text ?? '' }
    }
  }
  return { kind: 'pending' }
}

/**
 * Run the handoff pipeline for one source Session.
 * @param deps - injected session/workspace operations.
 * @param sessionId - source Session whose current task is handed off.
 * @param promptText - the locale-owned prompt naming the `/handoff` skill.
 * @returns the new Session id once the package reached it and the source was archived.
 */
export async function runHandoff(
  deps: HandoffDeps,
  sessionId: SessionId,
  promptText: string,
): Promise<SessionId> {
  const skills = await deps.listSkills(sessionId)
  if (!skills.some(skill => skill.name === HANDOFF_SKILL_NAME)) {
    throw new HandoffError('skill-missing', `skill "${HANDOFF_SKILL_NAME}" is not available in this session`)
  }

  // Subscribe BEFORE prompting: a fast model could close its turn before a
  // post-prompt subscription observes the events.
  const fromSeq = lastSeqOf(deps.eventWindow(sessionId))
  let resolvePackage!: (text: string) => void
  let rejectPackage!: (reason: unknown) => void
  const packagePromise = new Promise<string>((resolve, reject) => {
    resolvePackage = resolve
    rejectPackage = reject
  })
  let settled = { value: false }
  const off = deps.subscribeEvents(sessionId, () => {
    if (settled.value) return
    const extraction = extractHandoffPackage(deps.eventWindow(sessionId).entries, fromSeq)
    if (extraction.kind === 'pending') return
    settled = { value: true }
    off()
    if (extraction.text === '') {
      rejectPackage(new HandoffError('no-package', 'the handoff turn produced no package text'))
    } else {
      resolvePackage(extraction.text)
    }
  })

  try {
    await deps.prompt(sessionId, promptText)
  } catch (error) {
    if (!settled.value) {
      settled = { value: true }
      off()
    }
    throw new HandoffError('prompt-rejected', String(error))
  }
  const packageText = await packagePromise

  const workspaceId = deps.workspaceOf(sessionId)
  let newSessionId: SessionId
  try {
    newSessionId = await deps.createSession(workspaceId)
  } catch (error) {
    throw new HandoffError('create-failed', String(error))
  }
  deps.openSession(newSessionId)
  try {
    await deps.prompt(newSessionId, packageText)
  } catch (error) {
    throw new HandoffError('send-failed', String(error))
  }
  try {
    await deps.archiveSession(sessionId)
  } catch (error) {
    throw new HandoffError('archive-failed', String(error))
  }
  return newSessionId
}

/** Highest sequence number currently visible, so prior turns never match. */
function lastSeqOf(window: SessionEventWindow): number {
  let max = 0
  for (const entry of window.entries) {
    if (entry.type === 'event' && entry.event.seq > max) max = entry.event.seq
  }
  return max
}

/** Text blocks of one assistant message, newline-joined. */
function textContent(blocks: readonly ContentBlock[]): string {
  return blocks
    .filter((block): block is Extract<ContentBlock, { type: 'text' }> => block.type === 'text')
    .map(block => block.text)
    .join('\n')
}
