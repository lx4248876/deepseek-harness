# Agent Note: Composer 交接动作

Status: implemented

[English](2026-08-31-composer-handoff-action.md) | 中文

## Problem

Composer 工具行缺少把进行中任务移交到新会话的内建动作。此前用户只能手动复制对话记录或 fork 会话，转移后也没有任何动作归档源会话。`/handoff` 技能作为用户手势早已存在，但 Web 客户端没有编排完整流程的按钮。

## Decision

**新增 client 插件包 `@deepseek-ai/dsh-client-ui-handoff`，注册 `conversation.input.right` slot 条目 `id: 'handoff'`、`order: 90`。** 插件注册 typed locale namespace（`handoff`）的 `zh`/`en` 字典，并向 Composer 工具行注入一个 `onHandoff` verb。

**`src/client/handoff.ts` 中的 `runHandoff(sessionId, promptText)` 以注入 session/workspace 面的纯函数持有整条管线。** 它先列出会话技能目录：目录中没有 `handoff` 技能时，在发出任何消息、创建新会话或归档之前抛 `HandoffError('skill-missing')`。随后在提示模型之前订阅会话事件窗口，从助手轮次文本投影交接包，在源工作区创建新会话、打开它、把交接包作为首条消息入队，最后归档源会话。失败映射为稳定 `HandoffError` 码（`skill-missing`、`no-package`、`prompt-rejected`、`create-failed`、`send-failed`、`archive-failed`）。

**`HandoffButton` 只负责 pending/error 呈现。** 管线运行期间空闲文案切换为 `生成中`/`Generating`；失败时在 `role="alert"` span 渲染本地化错误（`未找到 handoff 技能，请先安装到技能目录。` / "The handoff skill is not available; install it in your skills directory."）。会话处于已移除、运行中、子代理或 Composer 机器忙时按钮禁用。

**注册行**：`packages/bundle/web-app/cordis.patch.yml` 与 `packages/bundle/web-app/package.json` 承载 `dsh.client` 行与依赖；`tsconfig.base.json`/`tsconfig.client.json` 引用该包；`pnpm-lock.yaml` 记录 workspace 链接。`pnpm --filter @deepseek-ai/dsh-client-ui-handoff bundle` 重建 bundle 后，实时 `dsh web` 才会提供该插件。

## Verification

包内单元套件（`packages/client/ui-handoff/tests/*`）覆盖提取、管线失败码与按钮呈现；`pnpm run test:gui` 覆盖 client 与 host GUI 包；`DSH_SNAPSHOT=replay pnpm run test:web` 覆盖组装后的浏览器，且 `snapshots/web/**` 与 `apps/web/tests/expected/**` 下的 Composer aria 金样已在同一改动中为新 Handoff 行更新。真实浏览器验收记录于 `.web-verify/reports/handoff-20260831-135100/report.md`，逐项断言按钮、生成→新会话流程、源会话归档与技能缺失反向路径。

## Alternatives considered

**复用会话 fork 动作。** 否决。fork 复制上下文却不生成任务交接包，也不归档源会话。

**把流程放进 `ui-conversation`。** 否决。每个 UI 特性是独立插件包，conversation 包只声明 slot；交接条目经 `ctx.slots.inject` 贡献，不占有其他包的界面。

**先归档源会话再投递交接包。** 否决。后续失败会毁掉新会话需要的对话记录；当前顺序只在交接包到达新会话后才归档。

## Consequences

- 只有会话技能目录安装了 `handoff` 技能时按钮才有意义；技能缺失时呈现本地化反向路径错误且无任何副作用。
- 交接是生成式模型动作：消耗一个模型轮次，耗时取决于助手产出交接包所需时间。
- 源会话只在新会话收到交接包后归档，投递失败时两个会话都保持原样。
- client UI 文案由 locale 持有（`verify-client-ui-i18n`）：新增措辞必须在 `zh` 与 `en` 两套字典中加 typed key。