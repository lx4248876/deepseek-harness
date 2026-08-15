# Agent Note: SSE tool-call id/name empty-string deltas no longer collapse the assembled call

Status: implemented

English | [中文](2026-08-14-sse-empty-tool-call-id-name-overwrite.zh.md)

## Problem

Against an OpenAI-compatible chat-completions gateway whose streaming SSE repeats `tool_calls[].id` and `tool_calls[].function.name` as empty strings `""` on every delta *after* the first chunk (instead of eliding them as the OpenAI spec does), every tool call failed with `unknown tool ""` and the follow-up request 400'd with `invalid input messages format 'name'`.

The DeepSeek stream assembler keyed its write guard on `!== undefined`:

```ts
if (call.id !== undefined) block.callId = call.id
if (call.function?.name !== undefined) block.name = call.function.name
```

`"" !== undefined` is true, so each subsequent delta overwrote the good `id`/`name` captured from the opening chunk with empty strings. The assembled tool-call block collapsed to `id=""` / `name=""`, the agent loop emitted a `tool/call` with an empty name, the local registry answered `ToolNotFoundError: unknown tool ""`, and the empty `name` echoed into the next request where strict validators rejected the message. Such gateways exist in the wild; this made tool calls unusable end-to-end on them.

## Decision

The write guards now treat empty strings as absent, matching the intent that `id`/`name` are only present on the opening chunk:

```ts
if (call.id) block.callId = call.id
if (call.function?.name) block.name = call.function.name
```

A truthy guard keeps the first-present value and skips the empty overwrite, while behaving identically to the old guard for spec-compliant feeds, whose subsequent deltas omit `id`/`name` (their value is `undefined`, not `""`). The arguments accumulator already tolerates empty fragments via `?? ''` and `+=`, so it needs no change.

## Alternatives considered

### Why not detect the gateway and only then fall back?

A state machine tracking "opening chunk already saw a value" would reach the same outcome with more surface: it must remember per-tool-call whether `id`/`name` were ever captured, adding a branch that the truthy guard subsumes. There is no case where an empty overwrite is the desirable outcome — a later chunk should never replace a real earlier value with `""` — so a uniform truthy guard is the smaller, complete fix.

## Consequences

Compliant providers are unaffected — the fix only changes behavior for feeds that repeat `""` where the spec omits the field. Non-compliant gateways regain working tool calls end-to-end on the same model and session. The change is confined to the `translate` stream assembler; serialization, request building, and the rest of the DeepSeek adapter are untouched.

## Testing

A regression test feeds an opening chunk with `id`/`name` followed by deltas that repeat them as `""`, and asserts the assembled block keeps the opening values; it failed before the fix and passes after. The existing "deltas that never carry id or name" test still passes, confirming the truthy guard turns no legitimate absent-field case into a present one.