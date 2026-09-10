# Project skeleton map

English | [中文](project-map.zh.md)

## Metadata
- base_ref: `20800ca71c` (master HEAD after the merge that brought the business WIP onto the 0.1.3-alpha.2 baseline)
- Update note: incremental update (verified after the 0.1.3-alpha.2 upgrade: directory responsibilities and key chains still accurate; upstream added `open-in-app` (the Web UI opening a workspace in a local application, the official counterpart of the local open-folder WIP), the model-switch notice, and lazy session-query events; the local archived view/restore and copy-feedback increments are now merged into `master`)

## Directory responsibilities
| Path | One-line responsibility |
|------|-------------------------|
| `packages/core/` | Product API spine: session, system-prompt, tools, agent, agent-loop |
| `packages/api/` | Remote BFF assembly and the Typert RPC gateway |
| `packages/llm/` | LLM capability (Service Definition/Consumer) and DeepSeek providers |
| `packages/client/` | Web client plugin packages: one package per UI feature, with `web/` as the platform shell |
| `packages/bundle/` | Installable `dsh --profile` patch-layer bundles (`web-app` aggregates the client rows) |
| `packages/session/` | Durable session data: persistence, projection, titles, telemetry |
| `packages/skill/` | Skill provider registry + local implementation + catalog/loader tools |
| `packages/sdk/` | JSON-RPC protocol + TypeScript client/server |
| `vendor/` | Vendored Cordis source (manifest + sync procedure in `vendor/README.md`) |
| `docs/` | Architecture, subsystems, cookbook, postmortems (`docs/AGENTS.md` owns the standard) |
| `.agents/` | Agent workflow skills and Agent Notes (`notes/`) |
| `scripts/` | Repository gates and generators |
| `apps/` | Application entry points (`apps/cli` and others) |
| `dsh-minimal-turbo/` | Local preset kit: the `minimal`/`enhanced` presets and one-click install scripts |

## Main entry points
- `pnpm dsh --profile headless "task"` — run one task (needs `DEEPSEEK_API_KEY`)
- `pnpm dsh --profile web` — start the Web client (the webserver listens on `127.0.0.1:3080`)
- `pnpm run test:gui` — GUI inner loop (seconds; the client suites plus the host-side GUI packages)
- `pnpm exec vitest run <path>` — targeted Vitest run
- `pnpm --filter <pkg> bundle` — rebuild one package's client bundle (required before probing a live `dsh web`)

## Key chains
| Chain | Entry | Main landing points | One line |
|-------|-------|---------------------|----------|
| Web client plugin assembly | `tsconfig.client.json` references + a row in `packages/bundle/web-app/cordis.patch.yml` | `packages/client/*/src/client` + `web-app` | One plugin package per UI feature, composed through `slots.register` |
| UI slot composition | `ui-conversation` declares the composer/chat rows | `packages/client/ui-conversation`, `ui-slots`, `ui-renderer` | Child plugins contribute entries only; they never declare another package's slot |
| Handoff action | The "Handoff" button in the composer tool row | `packages/client/ui-handoff/src/client/handoff.ts` + `HandoffButton.tsx` | Run the handoff skill → capture the package → continue in a new session → archive the source session |
| Archived session view and restore | The sidebar view-options menu's "Archived" mode | `packages/client/ui-workspace/src/client/tree.ts`, `rows/WorkspaceBrowser.tsx`, `packages/workspace/workspace/src/index.ts`, `packages/api/workspace-controller/src/` | `deriveArchived` projects the archived ids → the archived rows restore a session or copy its id → `workspaceRegistry.unarchiveSession` persists the set |

## Boundary against task-level artifacts
- A single request's file table or detailed base_ref table belongs in the spec's Code Map or the handoff package, not in this map.
- The current task's (`ui-handoff`) changes, verification, and commit decisions live in the handoff package, not in this map.
