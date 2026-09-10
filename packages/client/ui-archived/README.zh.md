---
description: "归档会话全局面板：列出 registry 全局归档集合，并在每行复制会话 ID。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-archived

[English](README.md) | 中文

## 概述

本包新增一个全局面板，列出 registry 全局归档集合：所有被 Workspace registry 从分组视图隐藏的会话，含其存储标题与每行的**复制会话 ID**动作。除该复制外，面板是只读的；恢复归档会话需要本部署尚不具备的 host 侧支持，因此面板直接说明该缺口，而不是提供一个无法生效的控件。

## 目录

- [组成](#composition)
- [模型体验](#model-experience)
- [已知限制与后续工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="composition"></a>
## 组成

浏览器侧只注册两项贡献：

1. key 为 `archived` 的 `main` 单元——面板主体。
2. id 相同、order 60 的 `sidebar.panellist` 行——选择该单元的侧栏图标。

面板通过 `main` 的标准 hook 读取两个输入，而不是自建订阅：布局提供 `useSessions` 取会话列表、`useWorkspaces` 取 `archivedSessionIds`。行标题取自会话列表中的存储标题；列表已不再持有的会话改渲染其 id。复制动作通过 [`@deepseek-ai/dsh-client-ui-primitives`](../ui-primitives/README.zh.md) 的 `writeClipboard` 写入会话 id，并用行标签回报结果。

Node 侧是 host `cordis.yml` 行的惰性加载位。

<a id="model-experience"></a>
## 模型体验

无，本面板属浏览器界面元素；此处没有任何内容进入模型请求。

#### KV Cache 影响

无；本包既不组装也不发送 provider 请求。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- **无法恢复。** registry 只暴露 `archiveSession` 与 `archivedSessionIds`；上游不存在取消归档的操作，因此本面板提供复制会话 ID，而不是恢复某行。
- **面板是投影，不是状态所有者。** 它渲染 Workspace 快照报告的既有内容；页面打开期间被归档的会话在该快照更新后出现。
- **列表已丢弃的会话渲染其 id。** 标题来自会话列表，因此空白或已撤回的摘要回退为 id 字符串。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

本面板是本地 fork 独有，不随上游发布。它取代迁移前 fork 内置在 `ui-workspace` 里的归档视图；面板改为经全局面板 API 触达归档集合，而不去改工作区浏览器，因此无需任何打补丁的已发布包。

</details>

**运行时不变式：** 不发布 companion。插件注册一个字典 effect、一个 `main` 单元与一个侧栏行，三者的释放由 HMR 安全测试证明；面板主体从标准 hook 派生全部取值，不存在会分叉的独立运行时观察。
