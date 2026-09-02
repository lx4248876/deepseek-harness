# @deepseek-ai/dsh-client-ui-handoff

Composer handoff action for the web client. A `handoff` button in the message composer tool row invokes the `handoff` skill in the current session, captures the generated handoff package, starts a new conversation whose first user message is that package, and archives the source session.

## Composition

The browser half registers one entry in the `conversation.input.right` composer tool row (`id: 'handoff'`, order 90). The slot is declared by [`@deepseek-ai/dsh-client-ui-conversation`](../ui-conversation/README.md); this package only contributes the entry. The node half is an inert loader seat for the host `cordis.yml` row.

The pipeline is a pure module over injected session/workspace faces (`src/client/handoff.ts`) and is covered by unit and plugin-level tests:

1. Verify the session skill catalog contains `handoff` (the host resolves cwd from the session header).
2. Prompt the source session with the locale-owned `/handoff` request.
3. Watch the session event window for the closing `turn/end` and extract the final `assistant/message` text as the package.
4. Create and open a new session in the same workspace and prompt it with the package text.
5. Archive the source session.

The button disables while the source session is running, hosts a subagent, is removed, or a prompt submission is in flight. Failures before archiving leave the source session untouched and surface localized copy in the composer row.

## Invariant

No invariant companion is published because the browser half registers one composer-tool-row entry whose disposal the HMR-safety spec proves, and `src/client/handoff.ts` is a pure module over injected session/workspace faces, so no independent runtime observations can diverge.

## Model Experience

One user turn: the button sends a short user message that names the `/handoff` skill gesture, so `dsh-tool-skill` injects the installed handoff skill instructions and the model produces the package as its final assistant message. The new conversation receives the package verbatim as its first user message. No session event vocabulary is added; any model-visible input is reconstructable from the ordinary `user/message` log.

## Known Limitations and Deferred Work

- The pipeline requires a `handoff` skill in the session's skill catalog (user, project, or bundled skill root). When the skill is missing, the button reports localization and leaves the session untouched rather than falling back to an unconstrained prompt.
- The flow always continues into a new conversation and archives the source without a review step; a draft-preview variant is deferred.
- An in-flight run is not cancellable and does not settle if the source session tears down before its turn closes; the button shows pending until the turn ends.