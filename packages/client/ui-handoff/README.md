---
description: "Composer handoff action for the Web client: one button drives the `/handoff` skill, continues the generated package in a new conversation, and archives the source session."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-handoff

English | [中文](README.zh.md)

## Summary

This package contributes one composer action: a **Handoff** button in the `conversation.input.right` tool row. Clicking it drives the `handoff` skill in the current session, takes the generated package as the first user message of a new conversation in the same workspace, and archives the session the package came from. The button disables while the source session is running, hosts a subagent, is removed, or a prompt submission is in flight; every failure before archiving leaves the source session untouched.

## Table of Contents

- [Composition](#composition)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="composition"></a>
## Composition

The browser half registers one entry in the `conversation.input.right` composer tool row (`id: 'handoff'`, order 90). The slot is declared by [`@deepseek-ai/dsh-client-ui-conversation`](../ui-conversation/README.md); this package only contributes the entry. The node half is an inert loader seat for the host `cordis.yml` row.

The pipeline lives in `src/client/handoff.ts` as a pure function over injected session/workspace faces:

1. Verify the session skill catalog contains `handoff` (the host resolves cwd from the session header).
2. Prompt the source session with the locale-owned `/handoff` request.
3. Watch the session event window for the closing `turn/end` and extract the final `assistant/message` text as the package.
4. Create a new session in the same workspace, carry the source session's durable title onto it (best-effort), open it, and prompt it with the package text.
5. Archive the source session.

Failures map to stable `HandoffError` codes — `skill-missing`, `no-package`, `prompt-rejected`, `create-failed`, `send-failed`, `archive-failed` — and the component renders the localized copy in the composer row. The button label, pending label, tooltip, and error text live in the typed `handoff` locale namespace.

<a id="model-experience"></a>
## Model Experience

Indirectly, through the ordinary prompt path this package drives: the button queues the locale-owned `/handoff` request as a plain user message, so `dsh-tool-skill` injects the installed handoff skill instructions and the model produces the package as its final assistant message. The pipeline reads that text from the session event window and queues it verbatim as the first user message of the new session. The package registers no prompt, tool schema, or session event of its own.

#### KV Cache effect

Append-only within each session it touches. The source session's request grows by one user message plus the model's own turn, and the new session starts a fresh request prefix with the package as its first user message; neither the package nor the client-side extraction replaces earlier request tokens. Reusing a cached prefix is preserved — the package introduces no volatile text ahead of it. Provider cache availability and eviction stay outside this package.

## Known Limitations and Deferred Work

- The pipeline requires a `handoff` skill in the session's skill catalog (user, project, or bundled skill root). When the skill is missing, the button reports localization and leaves the session untouched rather than falling back to an unconstrained prompt.
- The flow always continues into a new conversation and archives the source without a review step; a draft-preview variant is deferred.
- The title carry is best-effort: it applies only when the source has a durable title, and a rejected or failed rename is logged while the handoff still completes.
- An in-flight run is not cancellable and does not settle if the source session tears down before its turn closes; the button shows pending until the turn ends.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The package is local to this fork and is not published upstream. Pipeline decisions, failure codes, and the alternatives rejected for the new-conversation flow are recorded in the [composer handoff action Agent Note](../../../.agents/notes/implemented/feature/2026-08-31-composer-handoff-action.md).

</details>

**Runtime invariant:** No companion is published. The plugin registers one dictionary effect and one composer-tool-row entry whose disposal the HMR-safety spec proves; the pipeline is a pure module over injected session/workspace faces, so no independent runtime observations can diverge.
