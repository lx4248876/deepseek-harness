---
description: "Web 客户端的 Composer 交接动作：一个按钮驱动 `/handoff` 技能，把生成的交接包在新会话中继续，并归档源会话。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-handoff

[English](README.md) | 中文

## 概述

本包贡献一个 Composer 动作：`conversation.input.right` 工具行里的**交接**按钮。点击后它会驱动当前会话的 `handoff` 技能，把生成的交接包作为同一工作区中新会话的首条用户消息，并归档交接包来源的会话。源会话处于运行中、承载子代理、已被移除，或有提交中的提示词时按钮禁用；归档之前的任何失败都不会改动源会话。

## 目录

- [组成](#composition)
- [模型体验](#model-experience)
- [已知限制与后续工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="composition"></a>
## 组成

浏览器侧在 `conversation.input.right` Composer 工具行注册一个条目（`id: 'handoff'`、order 90）。该 slot 由 [`@deepseek-ai/dsh-client-ui-conversation`](../ui-conversation/README.zh.md) 声明；本包只贡献条目本身。Node 侧是 host `cordis.yml` 行的惰性加载位。

管线位于 `src/client/handoff.ts`，是以注入的 session/workspace 面为唯一依赖的纯函数：

1. 校验会话技能目录中存在 `handoff`（host 从会话 header 解析 cwd）。
2. 用 locale 持有的 `/handoff` 请求提示源会话。
3. 监听会话事件窗口，等 `turn/end` 收尾后提取最后一条 `assistant/message` 文本作为交接包。
4. 在同一工作区创建新会话，把源会话的持久标题带到它上面（尽力而为），打开它，并用交接包文本提示它。
5. 归档源会话。

失败映射为稳定的 `HandoffError` 码——`skill-missing`、`no-package`、`prompt-rejected`、`create-failed`、`send-failed`、`archive-failed`——组件在 Composer 行渲染对应本地化文案。按钮标签、pending 文案、提示与错误文本都存放在 typed 的 `handoff` locale namespace 中。

<a id="model-experience"></a>
## 模型体验

间接生效，经由本包驱动的普通提示词路径：按钮把 locale 持有的 `/handoff` 请求作为普通用户消息入队，因此 `dsh-tool-skill` 注入已安装的 handoff 技能说明，模型把交接包作为最后一条助手消息产出。管线从会话事件窗口读取该文本，并把它原样作为新会话的首条用户消息入队。本包不注册任何自己的提示词、工具 schema 或会话事件。

#### KV Cache 影响

在它触达的每个会话内都是只追加。源会话的请求增加一条用户消息与模型自身的轮次，新会话则从以交接包为首条用户消息的全新请求前缀开始；交接包与客户端侧提取都不会替换更早的请求 token。可复用的缓存前缀得以保留——交接包不会在它之前引入易变文本。provider 缓存的可用性与淘汰不属于本包的约定范围。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- 管线要求会话技能目录（用户、项目或随包分发的技能根）中存在 `handoff` 技能。技能缺失时按钮呈现本地化错误并保持会话原样，而不是回退到无约束的提示词。
- 流程总是继续到新会话并归档源会话，没有复核步骤；草稿预览变体暂缓。
- 标题搬运是尽力而为：仅在源会话已有持久标题时生效，rename 被拒绝或失败只记录日志，交接照常完成。
- 运行中的交接不可取消；若源会话在其轮次收尾前被销毁，运行不会落定，按钮保持 pending 直到轮次结束。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

本包是本地 fork 独有，不随上游发布。管线决策、失败码，以及新会话流程中被否决的备选方案记录在 [Composer 交接动作 Agent Note](../../../.agents/notes/implemented/feature/2026-08-31-composer-handoff-action.zh.md)。

</details>

**运行时不变式：** 不发布 companion。插件注册一个字典 effect 与一个 Composer 工具行条目，二者的释放由 HMR 安全测试证明；管线是以注入的 session/workspace 面为唯一依赖的纯模块，不存在会分叉的独立运行时观察。
