# 本地分叉升级指南

本文件是 `deepseek-harness` 本地分叉（`lx4248876/deepseek-harness`）从上游持续升级的操作手册。每次上游发布新 tag 时，按「每次升级流程」执行；本文件与 `docs/project-map.md` 在每次升级收尾时一起刷新提交。

## 当前基线

- 上游版本：`dsh-v0.1.3-alpha.2`
- 本地基线：0.1.3-alpha.2 升级合并 `6e59696451`；业务 WIP 合并后 `master` = `20800ca71c`（`docs/project-map.md` base_ref = `20800ca71c`）
- 根 `package.json` 与本地独有包 `@deepseek-ai/dsh-client-ui-handoff` 版本均为 `0.1.3-alpha.2`
- 业务增量已进 `master`：`merge/0.1.3-alpha.2-wip-workspace` → `20800ca71c`（archived 视图/恢复 + copy 反馈保留本地实现，open-folder 改用上游 `packages/client/ui-open-in-app`）；`merge/0.1.3-wip-workspace`（alpha.1 版）与 `stash@{1}` 已无用途

## 远程布局

| remote | URL | 用途 |
|--------|-----|------|
| `origin` | `https://github.com/deepseek-ai/deepseek-harness.git` | 只读，`git fetch --tags --prune origin` 拉新版本 tag |
| `fork` | `https://github.com/lx4248876/deepseek-harness.git` | 本地分支推送目的地（`git push fork ...`） |

`origin/master` 无跟踪；`fork/master` 是本地 `master` 的祖先（可 fast-forward 推送）。

## 本地定制清单（必须保留）

| 定制 | 关键落点 | 原始提交 |
|------|----------|----------|
| `ToolArgsError(toolName, violations)` 双参补丁 | `packages/core/tools/src/schema.ts`、`tests/tools.spec.ts`、`packages/subagent/subagent-in-process-driver/src/structured.ts` | `923f10a725` |
| `dsh-minimal-turbo` 预设工具包（`minimal`/`enhanced`） | `dsh-minimal-turbo/` | `24ed64842f` → enhanced 重构 `280c931dd9` |
| `dsh-pack.bat`（含 2 个后续 fix） | `dsh-pack.bat` | `b8346e431f`、`db90c5b976`、`d5b8b02bfb` |
| `ui-handoff` 交接插件 | `packages/client/ui-handoff/`、`packages/bundle/web-app/cordis.patch.yml`、`tsconfig.base.json`、`tsconfig.client.json`、web 快照 | `2a5fdaaf21` |
| `ui-handoff` 的 doc 门禁登记与双语文档（见「已知坑」） | `scripts/verify-package-readme-model-experience.ts`（`SENTENCE_MODEL_EXPERIENCE` 增加 `packages/client/ui-handoff`）、`packages/client/ui-handoff/README{,.zh,.i18n.yaml}`、`docs/project-map{,.zh,.i18n.yaml}`、`dsh-minimal-turbo/README{,.zh,.i18n.yaml}`、`.agents/notes/implemented/feature/2026-08-31-composer-handoff-action.i18n.yaml` | 本次交付 `20800ca71c` |

alpha.4 之后的本地演进提交（每次都要一并移植）：ui-handoff alpha.4 适配 `19d13dfca0`、minimal-turbo enhanced 重构 `280c931dd9`、版本对齐（alpha.5 `7520c20fa0`、rc.1 `db2b2baff6`）。

## 每次升级流程（V = alpha.N 或 rc.N，分支名 `upgrade/V`）

1. **冲突预检（动手前必做）**
   - `git fetch --tags --prune origin`
   - 上游改动文件集：`git diff --name-status dsh-v0.1.2-<上一tag> dsh-v0.1.2-<新tag>`
   - 取交集：`tsconfig.base.json`、`pnpm-lock.yaml`、`packages/bundle/web-app/package.json`、`packages/bundle/web-app/cordis.patch.yml`、`packages/core/tools/package.json`、`packages/client/package.json` 等
   - API 契约核对：slot 声明（`conversation.input.right` 等）、`SessionEventWindow`/`SessionSnapshot`、invariant 配套规则、corner-shape 规则、`send_message`/`Session.events`、storage 域格式；重点是 API 漂移而非文件重叠。
2. **保全 WIP**：`git stash push --include-untracked -m "wip: <说明>"`，确认 `git status` 干净；用户的 WIP 未经确认不提交，升级后必定 `stash pop` 恢复。
3. **建升级分支**：`git checkout -b upgrade/V dsh-v0.1.2-V`
4. **重放定制**：`git cherry-pick 923f10a725 24ed64842f b8346e431f db90c5b976 d5b8b02bfb 2a5fdaaf21`；冲突统一取升级分支侧（它包含全部本地定制 + 新上游）。
5. **补本地演进**：依序 cherry-pick `19d13dfca0`（alpha.4 适配）、`280c931dd9`（enhanced 重构）；目标：`git diff master upgrade/V` 只剩上游版本差异 + 本地文档（`docs/project-map.md`、`UPGRADE.md`）。
6. **版本对齐**：本地独有包（目前仅 `packages/client/ui-handoff/package.json`）版本改为新 tag 的版本号，提交 `chore(ui-handoff): align package version with V`。
7. **全量验证**（见下节）。
8. **合并回 master**：`git checkout master && git merge --no-ff upgrade/V -m "Merge branch 'upgrade/V'"`；add/add 冲突规则：ui-handoff 包取升级侧（`git checkout --theirs`），`docs/project-map.md` 与 `UPGRADE.md` 保留 master 侧（`git checkout --ours`）稍后刷新。
9. **恢复 WIP**：`git stash pop`（应无冲突；若有冲突只处理用户文件，不覆盖用户内容）。
10. **刷新文档**：`docs/project-map.md` 的 base_ref 改为合并提交哈希、更新说明行；`UPGRADE.md` 的当前基线同步刷新；提交 `docs: refresh baseline after V upgrade`。
11. **推送**：`git push fork master upgrade/V ...`（经用户确认后执行）。

## 验证命令（全部跑过且必须通过）

```text
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run test:gui
pnpm run verify-client-packages
pnpm run verify-package-dependencies
pnpm run verify-tsconfig-paths
pnpm run verify-package-invariants
pnpm run verify-export-jsdoc
pnpm --filter @deepseek-ai/dsh-tools test
pnpm --filter @deepseek-ai/dsh-subagent-in-process-driver test
```

发布级可选：`DSH_SNAPSHOT=replay pnpm run test:web`（UI 无改动时可跳过）。当前基线：`test:gui` 305 文件 / 4229 测试 / 1 skip，零失败。

`test:web` 本机（Windows）实测：342 项中 51 项失败，均为环境差异——上游 e2e 金样按 macOS/Linux 归一化（工作区路径、临时目录、会话 id 的别样拼写）且部分用例走真实 provider 路径；复现时把 `pnpm run test:web` 输出重定向到本地文件即可比对。已修的 Windows 缺陷：`apps/web/tests/scaffold.ts` 的 `normalizeAria` 原先只按 `/` 取 workspace basename，Windows 路径下归一化失效，令所有含工作区名的金样全红；改为按 `[\\/]` 切分后 `workspace-new-session-folding.e2e.ts` 通过。

## 已知坑（历史教训）

- **不要往 `src/` 落编译产物**（`*.js`/`*.d.ts`/`*.map`）：残留产物会被模块解析命中，`test:gui` 报 `TypeError: brandNumber is not a function`；用 `git status --porcelain` 过滤清理，且今后不在 `src` 下生成产物。
- **跨版本切分支后先 `pnpm run clean`**：旧基线遗留的 `lib/types/*.js` 产物会在 typecheck 的 tsdown 阶段报 `MISSING_EXPORT`（0.1.3 曾因 `session-persistence` 导出改名触发）；`pnpm run clean` 删除 275+ 路径后重跑即过。
- **`fs-ext`（0.1.3 新增原生依赖）在 Windows 编译失败**：本机缺 VS2022「使用 C++ 的桌面开发」工作负载时 `pnpm install --frozen-lockfile` 报 node-gyp `find VS` 错误；`@types/fs-ext` 已装则 **typecheck 不受影响**，可跳过该依赖的运行时测试继续验证；补装 VS C++ workload 或换 Linux 后即可完整 install。
- **git fetch 网络不稳时用 HTTP/1.1**：`git fetch --tags --prune origin` 可能报 `RPC failed; curl 56/92` / `early EOF`；加 `-c http.version=HTTP/1.1` 重试即可（0.1.3-alpha.2 拉取时遇到）。GitHub API（`api.github.com/repos/deepseek-ai/deepseek-harness/tags`）可作备用确认新 tag。
- **上游已吸收本地 open-folder 功能**：0.1.3-alpha.2 合入 `feat(workspace): open the workspace in local apps from the web UI (#3409)`（新包 `packages/client/ui-open-in-app`、`packages/host/open-in-app`），与本地 WIP 的 `openWorkspaceFolder` 前端注入功能重叠；业务分支合并 WIP 到新基线时，open-folder 增量优先改用上游实现，避免重复维护。
- **本地新增的 client 插件包必须同时登记 doc 门禁，否则每次升级 `doc-sync` 都红**：新包 README 需满足 `verify-package-readme-model-experience`（在 `scripts/verify-package-readme-model-experience.ts` 的 `SENTENCE_MODEL_EXPERIENCE` 或 `NO_MODEL_EXPERIENCE_SECTION` 里登记，短式必须写 `Indirectly, through …`/`None, as …` 一句 + `#### KV Cache effect` 一段）与 `doc-standard.spec.ts`（frontmatter `kind`/`description` + `## Summary`/`## Table of Contents`/`### Dev Note`）。这些门禁脚本本身属于本地定制，升级 cherry-pick 后要重新应用。
- **双语配对门禁覆盖全部在范围文档**：任何未配对的本地文档（`docs/project-map.md`、`dsh-minimal-turbo/README.md`、`packages/client/ui-handoff/README.md`、`.agents/notes/implemented/**` 笔记）都要补齐 `*.md` + `*.zh.md` + `*.i18n.yaml` 三件套，改完任一侧后用 `pnpm run verify-translation-pairing --write <pair>` 重录哈希；注意代码围栏内容两侧必须逐字节一致（README 目录树注释也要统一），锚点要两侧同时声明（`<a id="…"></a>`）。
- **本地包进目录生成物**：`pnpm run gen-client-catalog` 与 `pnpm run gen-config-catalog` 会把本地包写进 `packages/extensions/cordis-client-runner/src/client/slot-catalog.ts` 与 `docs/config-catalog.md`（后者是配对文档，英文侧改了要同步 `docs/config-catalog.zh.md` 并重录 `i18n.yaml`）。
- **inactive invariant 删除后的 README 原因句**必须匹配 `No invariant companion is published because ...`（反引号写法不匹配 `verify-package-invariants` 正则）。
- **全圆角/胶囊**必须 `border-radius` ≥ 99px 与 `corner-shape: round` 同规则配对（ui-theme 测试拦截）。
- **0.1.3 用户 WIP 结构性冲突**：本地未提交的 ui-workspace 增量（archived view / open local folder / copy 反馈）与上游 session-search-reveal 重构在 `Rows.tsx`、`WorkspaceBrowser.tsx`、`tree.client.spec.ts` 大块冲突，不宜自动合并；做法：`git stash apply 'stash@{0}'` 检视冲突 → `git reset --hard HEAD` 恢复 tracked → WIP 完整保留在 stash（untracked 一并保留），由用户在业务分支上基于 0.1.3 手工合并。合并结果已落 `merge/0.1.3-wip-workspace` 分支（`73c093a630`，保留作历史参照）；去除本地 open-folder、改用上游 `ui-open-in-app` 的重做版本为 `merge/0.1.3-alpha.2-wip-workspace`（`6a19eafa4b`），已并入 `master`（`20800ca71c`）。
- **上游已吸收的补丁**：alpha.3/4 上游已内置单参 `ToolArgsError(violations)`；本地双参版本是独有增量，若上游未来吸收才可删除本地版本。
- **推送注意**：`origin` 是上游只读；推送一律走 `fork`。
- **stash 状态**：`stash@{1}`（旧 ToolArgsError 补丁，内容已落地）已于本次交付删除；`stash@{0}`（pre-0.1.3 原始业务 WIP）内容已被 `20800ca71c` 覆盖，确认无回退需求后可删。