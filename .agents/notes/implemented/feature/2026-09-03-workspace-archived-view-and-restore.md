# Agent Note: Workspace archived view and restore

Status: implemented

English | [中文](2026-09-03-workspace-archived-view-and-restore.zh.md)

## Problem

The session archive set note hid archived sessions from every grouping surface, but the Web client had no way to see which sessions were archived or to restore one; the missing surface was a documented known limitation. Separately, users needed a way to copy a session id from the row menu for workflows outside the UI.

## Decision

**Unarchive is the idempotent inverse of archive at every layer, and the sidebar gains an archived view that lists hidden sessions and restores them; every non-blank session row gains a copy-session-id menu action.**

- Registry: `ctx.workspaceRegistry.unarchiveSession(id)` rides the same `enqueueOperation` chain as archive; an id outside the set resolves without writing, the set update persists through the existing domain-global write, and the session keeps its workspace accounting slot untouched.
- RPC: `workspace.unarchiveSession({sessionId}) → {archivedSessionIds}` answers the full updated set, symmetric with archive. The existing `{ type: 'archived' }` follow increment already propagates any set change, so no new frame type or client merge path was needed; the client model installs the returned set after a successful unary call.
- UI: the sidebar's view-options menu adds an **Archived** mode. `deriveArchived` projects the archived ids against the session list snapshot — title, recency, Workspace label through the existing membership map, and gaps skipped when a summary has not landed — and the browsing region renders the rows with an empty state. Each archived row restores the session or copies its session id; restoring does not open the session, preserving the existing clear-current-when-archived navigation rule.
- Copy session id: every non-blank session row menu (normal and archived rows) adds **Copy session ID**, using `writeClipboard` from `dsh-client-ui-primitives` with a transient copied label and a console warning on failure.
- The browser view store persists the archived-mode flag under a new key (`dsh.workspace.view.v6`) because rehydration replaces the whole payload and a missing field would leave an ill-typed state.

## Alternatives considered

**Open archived sessions from the archived view.** Rejected: the navigation policy clears the current selection when it enters the archive set; opening from the archived view would need an exception and a way to keep a row both visible and selectable. Restore-then-open keeps one rule.

**Reuse search to find archived sessions.** Rejected: search deliberately excludes archived sessions; the archived view is the single surface for the hidden set.

**Add a per-session restore flag to SessionSummary.** Rejected for the same cross-domain coupling reason as the archive flag (see the archive-set note); the registry-global set stays the single source.

## Consequences

- The documented "no viewing or unarchive surface" limitation is lifted; the README pairs for `dsh-workspace`, `dsh-api-workspace-controller`, and `dsh-client-ui-workspace` describe the archived view and restore.
- The archived view intentionally does not open sessions: restoring is the only navigation path out of the archived set.
- The view-store key bump discards previously persisted browser-local view preferences once (grouping mode, expansion, and local session orders reset to defaults).
- Copying a session id requires the browser clipboard API; `writeClipboard` falls back to `execCommand` and reports failure so the menu never claims success it did not achieve.