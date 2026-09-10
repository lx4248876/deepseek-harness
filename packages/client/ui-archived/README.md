---
description: "Archived-session global panel: lists the registry-global archive set and copies a session id from each row."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-archived

English | [中文](README.zh.md)

## Summary

This package adds one global sidebar panel that lists the registry-global archive set: every session the Workspace registry hides from the grouping surfaces, with its stored title and a **Copy session ID** action per row. The panel is read-only apart from that copy; restoring an archived session needs host-side support this deployment does not carry, so the panel states the gap instead of offering a control that cannot work.

## Table of Contents

- [Composition](#composition)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="composition"></a>
## Composition

The browser half registers two contributions and nothing else:

1. A `main` cell under the key `archived` — the panel body.
2. A `sidebar.panellist` row with the same id, order 60 — the sidebar icon that selects that cell.

The panel reads both inputs through the `main` standard hooks rather than its own subscriptions: the layout supplies `useSessions` for the session list and `useWorkspaces` for `archivedSessionIds`. A row's title is the stored title from the session list; a session the list no longer carries renders its id instead. The copy action writes the session id with `writeClipboard` from [`@deepseek-ai/dsh-client-ui-primitives`](../ui-primitives/README.md) and reports the outcome through the row label.

The node half is an inert loader seat for the host `cordis.yml` row.

<a id="model-experience"></a>
## Model Experience

None, as the panel is browser chrome; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Restore is not available.** The registry exposes `archiveSession` and `archivedSessionIds` only; an unarchive operation does not exist upstream, so this panel copies a session id instead of restoring a row.
- **The panel is a projection, not the owning state.** It renders whatever the Workspace snapshot reports; a session archived while the page is open appears when that snapshot updates.
- **A session the list has dropped renders its id.** Titles come from the session list, so a blank or withdrawn summary falls back to the id string.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The panel is local to this fork and is not published upstream. It replaces the in-tree archived view that the pre-migration fork carried inside `ui-workspace`; the panel reaches the archive set through the global panel API instead of editing the workspace browser, so it needs no patched published package.

</details>

**Runtime invariant:** No companion is published. The plugin registers one dictionary effect, one `main` cell, and one sidebar row whose disposal the HMR-safety spec proves, and the panel body derives every value from the standard hooks, so no independent runtime observations can diverge.
