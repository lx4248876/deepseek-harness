# web-verify 结果 — 归档会话视图 + 恢复 + 复制会话 ID

**日期**: 2026-09-03
**底座**: 当前 harness 浏览器能力（Playwright MCP，headless chromium）
**范围**: 只验证本次实现的差异点——①每个会话行菜单「复制会话 ID」；②「归档会话」后行消失；③「视图选项 → 已归档」列表（标题/所属工作区/时间、隐藏搜索）；④归档行「恢复会话」与「复制会话 ID」；⑤恢复后归位与空态。
**服务**: `http://127.0.0.1:57020`（隔离 `DSH_HOME=%TEMP%\dsh-web-verify-archived-view`，`dsh web --port 0 --no-open`，启动令牌 `?token=` 交换 cookie 认证；未触碰真实 `~/.dsh` 与已在 3080 运行的实例）
**证据目录**: `.web-verify/reports/archived-session-view-20260903/`

### PASS: 会话行菜单包含「复制会话 ID」且写入正确值
- 动作: 悬停会话行「deepseek-harness 1小时」→ 点开行菜单 → 断言菜单四项（重命名/分叉会话/归档会话/复制会话 ID）→ 用 Playwright 桩记录 `navigator.clipboard.writeText` 后点击「复制会话 ID」。
- 断言: 菜单项存在；`writeText` 收到 `session-6098f223-95e1-457a-bbcd-321fb36fcb5c`；页面出现「已复制」反馈（`feedbackVisible: 1`）。
- 证据: 语义快照（行菜单 `menu` 节点含四个 menuitem）；`browser_run_code_unsafe` 返回 `{"captured":"session-6098f223-…","feedbackVisible":1}`。

### PASS: 「归档会话」后行从普通树消失
- 动作: 同一菜单点「归档会话」。
- 断言: `find "1小时"` 无匹配；树「展开其余」计数 27 → 26。
- 证据: `browser_find` 空结果 + 后续快照 `02-restored-tree.snapshot.md` 前状态。

### PASS: 「视图选项 → 已归档」入口与归档列表
- 动作: 点「视图选项」→ 菜单含「已归档」项 → 点击。
- 断言: 区头变为「已归档」；列表显示归档行（标题 deepseek-harness / 所属工作区 deepseek-harness / 1小时）；搜索输入框隐藏。
- 证据: `01-archived-view.png` + 归档视图语义快照（`tree "已归档"` 单行 `deepseek-harness deepseek-harness 1小时`）。

### PASS: 归档行菜单「恢复会话 + 复制会话 ID」
- 动作: 悬停归档行 → 点开菜单。
- 断言: 菜单恰含「恢复会话」与「复制会话 ID」两项。
- 证据: 归档菜单语义快照（`menu` 两 menuitem）。

### PASS: 「恢复会话」→ 空态 + 普通视图归位
- 动作: 点「恢复会话」→ 「已归档」视图显示空态 → 视图选项再次关「已归档」。
- 断言: 归档列表显示「暂无已归档会话」；普通树重新出现「deepseek-harness 1小时」行。
- 证据: `02-restored-tree.snapshot.md`（`tree "会话"` 含 `deepseek-harness 1小时`）。

## 汇总: PASS 5 / FAIL 0 / BLOCKED 0

**禁漂移声明**: 页面动作/断言全部经当前 harness 的 `mcp__browser__browser_*` 执行；未使用外部浏览器适配器冒充。