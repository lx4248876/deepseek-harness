# Agent Note: SSE 工具调用 id/name 空字符串增量不再让装配出的调用塌缩

Status: implemented

English | [English](2026-08-14-sse-empty-tool-call-id-name-overwrite.md)

## 问 题

面对一个 OpenAI 兼容的 chat-completions 网关，其流式 SSE 在**首块之后**的每个增量里，把 `tool_calls[].id` 和 `tool_calls[].function.name` 重复成空字符串 `""`（而非像 OpenAI 规范那样省略这些字段），此时每个工具调用都以 `unknown tool ""` 失败，后续请求还以 `invalid input messages format 'name'` 报 400。

DeepSeek 流装配器把写入守卫建立在 `!== undefined` 上：

```ts
if (call.id !== undefined) block.callId = call.id
if (call.function?.name !== undefined) block.name = call.function.name
```

`"" !== undefined` 成立，因此每个后续增量都用空字符串覆盖了首块捕获到的正确 `id`/`name`。装配出的工具调用块塌缩为 `id=""` / `name=""`，agent 循环发出空名字的 `tool/call`，本地注册表以 `ToolNotFoundError: unknown tool ""` 应答，空 `name` 又回显进下一个请求并触发严格校验拒绝。这类网关在现实中存在；这让工具在这些网关上端到端不可用。

## 决 策

写入守卫现在把空字符串视为缺省，与"`id`/`name` 只出现在首块"的意图一致：

```ts
if (call.id) block.callId = call.id
if (call.function?.name) block.name = call.function.name
```

真值守卫保留首个出现的值并跳过空覆盖，同时对合规 feed 行为与旧守卫一致——其后续增量的 `id`/`name` 值是 `undefined` 而非 `""`。参数累加已通过 `?? ''` 与 `+=` 容忍空片段，无需改动。

## 考 虑 的 替 代 方 案

### 为什么不检测网关、仅在其存在时才回退？

一个跟踪"首块是否已捕获到值"的状态机会得出同样结果，但接口更多：它必须按工具调用记忆 `id`/`name` 是否曾被捕获，新增一个真值守卫已涵盖的分支。空覆盖绝不应该是理想结果——后续块绝不该用 `""` 覆盖早期真值——因此统一真值守卫是更小、更完整的修复。

## 后 果

合规 provider 不受影响——该修复只改变"在本该省略字段处重复 `""`"的 feed 的行为。非合规网关在同样的模型与会话上恢复端到端可用的工具调用。改动限于 `translate` 流装配器；序列化、请求构建与 DeepSeek 适配器其余部分均未触及。

## 测 试

回归测试喂入一个带 `id`/`name` 的首块，随后重复它们为 `""` 的增量，并断言装配出的块保留首块值；修复前失败、修复后通过。既有的 "deltas that never carry id or name" 测试依然通过，确认真值守卫不会把任何合法的缺省字段情况变成存在情况。