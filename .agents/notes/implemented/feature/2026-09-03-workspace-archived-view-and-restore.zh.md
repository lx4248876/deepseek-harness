# Agent Note: Workspace 已归档视图与恢复

Status: implemented

[English](2026-09-03-workspace-archived-view-and-restore.md) | 中文

## 问题

会话归档笔记把已归档会话从所有分组视图隐藏，但 Web 客户端既看不到哪些会话被归档，也无法恢复其中任意一个；这个缺失的入口是文档化的已知限制。另外，用户需要在行菜单里复制会话 id，以便在 UI 之外的工作流中使用。

## 决策

**取消归档（unarchive）在每一层都是归档（archive）的幂等逆操作；侧边栏新增已归档视图，列出隐藏会话并允许恢复；每个非空会话行都新增复制会话 ID 的菜单动作。**

- 注册表：`ctx.workspaceRegistry.unarchiveSession(id)` 与归档走同一条 `enqueueOperation` 链；不在集合中的 id 直接返回且不写盘，集合更新经既有 global 写持久化，会话的 workspace 记账 slot 不受影响。
- RPC：`workspace.unarchiveSession({sessionId}) → {archivedSessionIds}` 应答更新后的完整集合，与归档对称。既有 `{ type: 'archived' }` follow 增量本就会推送任意集合变化，因此无需新帧类型或新 client 合并路径；unary 成功后 client model 安装返回的完整集合。
- UI：侧边栏视图选项菜单新增**已归档**模式。`deriveArchived` 用会话列表快照投影归档 id——标题、相对时间、经既有 membership map 得出所属 Workspace label，摘要尚未到达的 id 跳过——浏览区渲染这些行并提供空态。每个归档行可恢复会话或复制其会话 id；恢复不会打开会话，保留「当前选中落入归档集合时清空回 hero」的既有导航规则。
- 复制会话 ID：每个非空会话行菜单（普通行与归档行）新增**复制会话 ID**，使用 `dsh-client-ui-primitives` 的 `writeClipboard`，带短暂「已复制」反馈，失败时 console.warn。
- 浏览器视图 store 在**新键**（`dsh.workspace.view.v6`）下持久化已归档模式标记，因为 rehydration 是整值替换，缺字段会留下类型不实的状态。

## 已考虑的替代方案

**在已归档视图里直接打开会话。** 否决：导航策略会在当前选中落入归档集合时清空它；从已归档视图打开需要例外，还要处理「行既可见又可选中」。先恢复再打开只保留一条规则。

**复用搜索去找已归档会话。** 否决：搜索有意排除归档会话；已归档视图是隐藏集合的唯一入口。

**在 SessionSummary 上增加 per-session 恢复标记。** 否决：与归档标记同因跨域耦合（见归档集合笔记）；注册表级全局集合继续作为唯一来源。

## 后果

- 「无查看/取消归档入口」的文档化限制已解除；`dsh-workspace`、`dsh-api-workspace-controller`、`dsh-client-ui-workspace` 的 README 对现描述已归档视图与恢复。
- 已归档视图有意不直接打开会话：恢复是离开归档集合的唯一导航路径。
- 视图 store 的键升级会让此前持久化的浏览器本地视图偏好重置一次（分组方式、展开状态与本地顺序回默认值）。
- 复制会话 ID 依赖浏览器剪贴板 API；`writeClipboard` 回退到 `execCommand` 并回报失败，菜单不会假装成功。