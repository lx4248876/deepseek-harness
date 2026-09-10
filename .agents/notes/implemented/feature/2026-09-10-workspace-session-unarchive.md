# Agent Note: Workspace session unarchive

Status: implemented

English | [中文](2026-09-10-workspace-session-unarchive.zh.md)

## Problem

The registry-global archive set hides a Session from every grouping surface, and the set had no inverse. A hidden Session kept its history and its workspace accounting slot, but nothing could return it to the grouping surfaces, and both package READMEs documented the one-way behavior as a known limitation.

## Decision

**`unarchiveSession(sessionId)` is the idempotent inverse of `archiveSession` at the registry, and it rides the same serialized write chain.**

- Registry: `ctx.workspaceRegistry.unarchiveSession(id)` runs inside `enqueueOperation`, so it serializes against every other registry write. An id outside the set resolves without writing, and the Session keeps its workspace accounting slot untouched.
- RPC: `workspace.unarchiveSession({sessionId}) → {archivedSessionIds}` answers the complete updated set, symmetric with `archiveSession`. The existing `{ type: 'archived' }` follow increment already propagates any set change, so the change needed no new frame type and no second client merge path.
- Client: `IWorkspaces.unarchiveSession` and `UiWorkspaceService.unarchiveSession` expose the verb to UI consumers, and `ClientWorkspaceModel` installs the returned set after a successful unary call.

## Verification

`packages/workspace/workspace/tests/workspace.spec.ts` covers the durable write, the untouched accounting slot, the idempotent miss (no medium rewrite, no emitted change), and persistence across a restart. `packages/api/workspace-controller/tests/workspace-controller.host.spec.ts` covers the command result and the `archived` follow increment in both directions; `transport.client.spec.ts` and `model.client.spec.ts` cover the facade error mapping and the client-side set installation; `packages/client/ui-workspace/tests/workspaces-service.client.spec.ts` covers the service delegation and its failure path.

## Alternatives considered

**Fold restore into `archiveSession` behind a boolean.** Rejected: the two operations have different preconditions — archive validates that the Session exists, restore deliberately does not — and one signature would carry a mode the registry does not otherwise model.

**Store the archive bit on the Session record.** Rejected for the same cross-domain coupling reason as the archive flag: the registry-global set stays the single source that every grouping surface filters against, and a per-Session bit would need a second write path through Session persistence.

## Consequences

- The archive set is now a two-way durable display filter: archiving hides a Session from the grouping surfaces and restoring returns it to every one of them.
- `archiveSession` remains the only operation that validates Session existence, because restoring an absent Session is a no-op rather than an unknown-session failure.
- The documented one-way limitation is lifted in the `dsh-workspace` and `dsh-api-workspace-controller` README pairs, and the generated `ctx.workspaceController` surface in `docs/subsystems/workspace.md` lists the new method.
