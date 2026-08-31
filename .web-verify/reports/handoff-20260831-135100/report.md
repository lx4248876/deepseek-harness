# web-verify 结果 — ui-handoff Composer 交接按钮插件

**底座**: 当前 harness 浏览器能力（DSH 已装底座：@deepseek-ai/dsh-mcp-client 桥接 @playwright/mcp，stdio、headless、isolated，serverName=browser）
**范围**: 只验证本次差异 —— `packages/client/ui-handoff` 输入框右侧「交接」按钮实时行为（a 按钮出现 / b 生成并打开新会话 / c 源会话归档 / d 技能缺失反向路径）
**服务**: http://127.0.0.1:3080（`dsh web`；会话期为获取浏览器会话凭证与排障，期间服务由宿主侧重启，验收结束时服务保持运行，pid 22280）
**证据目录**: `.web-verify/reports/handoff-20260831-135100/`

## PASS: a. 输入框右侧出现「交接」按钮
- 动作: `browser_navigate` 打开 `http://127.0.0.1:3080/`（先经底座 `browser_run_code_unsafe` 注入浏览器会话 cookie），`browser_snapshot` 定位 Composer 工具行；`browser_click` 目标为 `button "交接"`。
- 断言: 语义快照中 Composer 输入框右侧工具行存在 `button "交接" [ref=e196]`（非禁用、空闲会话可点击）。
- 证据: `01-handoff-button.png`、`01-handoff-button.snapshot.txt`
- 说明: 中文本地化文案为「交接」（locales.ts `button.label`），与差异点一致。

## PASS: b. 点击后进入「生成中」，模型产出交接包并自动打开新会话
- 动作: 空闲会话点击「交接」→ 立即 `browser_snapshot` 断言 pending 态；等待模型轮次结束与管线（建新会话→以交接包为首条消息→归档源会话）完成。
- 断言:
  1. 点击后按钮变为 `button "生成中" [disabled]`，统计条显示模型轮进行中（快照 02）。
  2. 管线完成后面向新会话: 页面标题变为 `# 任务交接包 ## 主任务 ...`，新会话首条用户消息为完整 Markdown 交接包，含 `# 任务交接包` 与 `## 主任务`（快照 03、03b）。
- 证据: `02-generating.png`、`02-generating.snapshot.txt`；`03-new-session.png`、`03-new-session.snapshot.md`（product-cost 工作区实例）；`03b-deepseek-harness-new-session.png`、`03b-deepseek-harness-new-session.snapshot.md`（deepseek-harness 工作区实例，交接包内容即本次 ui-handoff 任务本身）
- 说明: 两次真实运行均通过；deepseek-harness 实例生成包中明确首条消息为「# 任务交接包 ## 主任务 完成并收尾 Web 客户端 Composer『交接』按钮功能：@deepseek-ai/dsh-client-ui-handoff…」，且新会话已自动打开。

## PASS: c. 旧会话从侧栏消失（归档）
- 动作: b 完成后对侧栏会话树 `browser_snapshot`。
- 断言: 源会话「请启用 handoff 技能（/handoff）」不再出现在侧栏树中；新会话「# 任务交接包 ## 主任务 …」出现并处于选中态。
- 证据: `03-new-session.snapshot.md`（product-cost 运行后侧栏仅剩新包会话与历史会话）、`03b-deepseek-harness-new-session.snapshot.md`（deepseek-harness 运行后源会话已消失）
- 说明: 归档动作由 `uiWorkspace.archiveSession` 完成，侧栏树为持久会话列表投影，消失即归档生效。

## PASS: d. 技能缺失反向路径（首轮 FAIL 记录 + 复验通过）
- 首轮 FAIL（历史）: 尝试按用户口径临时移走 `~/.agents/skills/handoff`（并进一步移走镜像目录 `C:\A-codes\lix\constraint\my-skills\skills\handoff`、重启服务后仍复测），服务器 `skills/list` 始终返回 24 项含 `handoff`。根因：本机工具 shell 的文件系统视图与服务器实际读取的技能根不一致（探针实验：`~/.agents/skills` 新建 `zz-webverify-probe` 服务器端不出现），无法经目录改名让常驻服务器失配。验后已将两处技能目录恢复原位，dsh 服务保持运行。
- 复验策略: 不改名、不停服（pid 22280 保持运行）。改用「会话切换 `minimal` preset」使服务器端真实返回空技能目录：`minimal` preset 的组合不挂载任何技能目录，`skills/list` 对该会话返回 0 项，与目录缺失等价进入同一 `skill-missing` 分支（`runHandoff` → `HandoffError('skill-missing')` → `error.skillMissing`）。
- 动作: UI 新建空闲会话「新会话」（session-0bceece7-a060-46dd-8a2e-79f80ff5b06e，product-cost 工作区）→ 服务器端 `agentPresets/select { agentId, agentPreset: 'minimal' }` → 服务器端 `skills/list` 返回 0 项（handoff 缺失，前置确认见 `04-skill-missing-server-side.txt`）→ 真实浏览器点击 Composer「交接」→ `browser_snapshot` 断言。
- 断言（PASS）:
  1. Composer 工具行出现 `alert` 文案 `未找到 handoff 技能，请先安装到技能目录。`（`locales.ts error.skillMissing`）。
  2. 「交接」按钮未进入「生成中」（未启动模型轮），仍为可点击状态。
  3. 源会话「新会话」仍在侧栏并保持选中（未归档、未发消息）。
  4. 未创建「# 任务交接包」新会话。
- 证据: `04-skill-missing.png`、`04-skill-missing.snapshot.txt`、`04-skill-missing-server-side.txt`
- 说明: 全程未停/重启 dsh 服务；d 点浏览器侧断言为真实 `mcp__browser__browser_*` 动作+语义快照，未以单测或外部适配器冒充 PASS。复验后已把测试会话 preset 恢复为 wish-lite。

## 汇总: PASS 4 / FAIL 0 / BLOCKED 0
**禁漂移声明**: 未使用未明示的浏览器工具或适配器冒充本报告 PASS；所有页面动作/断言均经当前 harness 的 `mcp__browser__browser_*` 执行（含同底座 Playwright MCP 的 `browser_run_code_unsafe` 仅用于注入本地浏览器会话 cookie 与直连 `/api` 校验，不是外部浏览器适配器）。