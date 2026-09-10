# Agent Note: Workspace 会话取消归档

Status: implemented

[English](2026-09-10-workspace-session-unarchive.md) | 中文

## Problem

registry 全局归档集合会把会话从所有分组视图隐藏，而该集合没有逆操作。被隐藏的会话保留其历史与工作区记账位置，但没有任何操作能把它送回分组视图，两个包的 README 也把这种单向行为记为已知限制。

## Decision

**`unarchiveSession(sessionId)` 是 registry 上 `archiveSession` 的幂等逆操作，并走同一条串行化写入链。**

- Registry：`ctx.workspaceRegistry.unarchiveSession(id)` 在 `enqueueOperation` 内执行，因此与所有其他 registry 写入串行化。集合外的 id 直接 resolve 且不写入，会话的工作区记账位置保持不变。
- RPC：`workspace.unarchiveSession({sessionId}) → {archivedSessionIds}` 返回更新后的完整集合，与 `archiveSession` 对称。既有的 `{ type: 'archived' }` follow 增量已能传播集合变化，因此该改动无需新增帧类型，也无需第二条客户端合并路径。
- Client：`IWorkspaces.unarchiveSession` 与 `UiWorkspaceService.unarchiveSession` 把该动作暴露给 UI 消费方，`ClientWorkspaceModel` 在一次成功的 unary 调用后装载返回的集合。

## Verification

`packages/workspace/workspace/tests/workspace.spec.ts` 覆盖持久写入、记账位置不受影响、幂等落空（不重写介质、不发变更事件）以及重启后的持久性。`packages/api/workspace-controller/tests/workspace-controller.host.spec.ts` 覆盖命令返回值与两个方向的 `archived` follow 增量；`transport.client.spec.ts` 与 `model.client.spec.ts` 覆盖门面错误映射与客户端集合装载；`packages/client/ui-workspace/tests/workspaces-service.client.spec.ts` 覆盖服务层委托及其失败路径。

## Alternatives considered

**用布尔参数把恢复折进 `archiveSession`。** 否决：两者的前置条件不同——归档要校验会话存在，恢复刻意不校验——单一签名会引入 registry 别处并不建模的模式位。

**把归档标记存到会话记录上。** 否决，理由与归档标记的同域耦合相同：registry 全局集合仍是所有分组视图过滤所依赖的唯一真源，而每个会话一个位需要经由 Session 持久化再开一条写入路径。

## Consequences

- 归档集合现在是双向的持久显示过滤器：归档把会话从分组视图隐藏，恢复把它送回每一个分组视图。
- `archiveSession` 仍是唯一校验会话是否存在的操作，因为恢复一个不存在的会话是空操作而非 unknown-session 失败。
- `dsh-workspace` 与 `dsh-api-workspace-controller` 的 README 配对中，单向限制的记录已被移除；`docs/subsystems/workspace.md` 的生成式 `ctx.workspaceController` 表面列出了新方法。
