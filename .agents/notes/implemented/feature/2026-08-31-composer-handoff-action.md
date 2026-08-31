# Agent Note: Composer handoff action

Status: implemented

English | [中文](2026-08-31-composer-handoff-action.zh.md)

## Problem

The composer tool row had no purpose-built action for transferring a running task to a new conversation. Users could only copy transcripts manually or fork a session, and nothing archived the source after the transfer. The `/handoff` skill existed as a user gesture, but the Web client offered no button that orchestrated the full flow.

## Decision

**A new client plugin package `@deepseek-ai/dsh-client-ui-handoff` registers the `conversation.input.right` slot entry `id: 'handoff'`, `order: 90`.** The plugin registers a typed locale namespace (`handoff`) with `zh`/`en` dictionaries and injects one `onHandoff` verb into the composer tool row.

**`runHandoff(sessionId, promptText)` in `src/client/handoff.ts` owns the pipeline as a pure function over injected session/workspace faces.** It lists the session skill catalog first: a catalog without the `handoff` skill throws `HandoffError('skill-missing')` before any message, new session, or archive. It subscribes to the session event window before prompting, projects the handoff package from the assistant turn text, then creates a new session in the source workspace, opens it, queues the package as its first message, and archives the source session. Failures map to stable `HandoffError` codes (`skill-missing`, `no-package`, `prompt-rejected`, `create-failed`, `send-failed`, `archive-failed`).

**`HandoffButton` owns only pending/error presentation.** Pending copy `生成中`/`Generating` replaces the idle label while the pipeline runs; a failed run renders the localized error (`未找到 handoff 技能，请先安装到技能目录。` / "The handoff skill is not available; install it in your skills directory.") in a `role="alert"` span. The button disables while the session is removed, running, a subagent, or the composer machine is busy.

**Registration rows**: `packages/bundle/web-app/cordis.patch.yml` and `packages/bundle/web-app/package.json` carry the `dsh.client` row and dependency; `tsconfig.base.json`/`tsconfig.client.json` reference the package; `pnpm-lock.yaml` records the workspace links. The bundle is rebuilt with `pnpm --filter @deepseek-ai/dsh-client-ui-handoff bundle` before a live `dsh web` serves it.

## Verification

Package unit suites (`packages/client/ui-handoff/tests/*`) cover extraction, pipeline failure codes, and button presentation; `pnpm run test:gui` covers the client and host GUI packages; `DSH_SNAPSHOT=replay pnpm run test:web` covers the assembled browser, and the composer aria goldens under `snapshots/web/**` and `apps/web/tests/expected/**` were updated in the same change for the new Handoff row. Real-browser acceptance in `.web-verify/reports/handoff-20260831-135100/report.md` asserts the button, the generate→new-session flow, source archive, and the missing-skill reverse path.

## Alternatives considered

**Reuse the session fork action.** Rejected because fork duplicates context without generating a task-transfer package and does not archive the source session.

**Implement the flow inside `ui-conversation`.** Rejected because each UI feature is its own plugin package and the conversation package only declares slots; the handoff entry contributes through `ctx.slots.inject` without owning another package's surface.

**Archive the source before delivering the package.** Rejected because a later failure would destroy the transcript the new session needs; the current order archives only after the package reaches the new session.

## Consequences

- The button is meaningful only when the `handoff` skill is installed in the session's skill catalog; a missing skill surfaces the localized reverse-path error with no side effects.
- Handoff is a generative model action: it costs a model turn and takes as long as the assistant needs to produce the package.
- The source session is archived only after the new session receives the package, so failed deliveries leave both sessions intact.
- Client UI copy is locale-owned (`verify-client-ui-i18n`): adding wording requires a typed key in both `zh` and `en`.