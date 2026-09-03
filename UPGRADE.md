# 本地分叉升级指南

本文件是 `deepseek-harness` 本地分叉（`lx4248876/deepseek-harness`）从上游持续升级的操作手册。每次上游发布新 tag 时，按「每次升级流程」执行；本文件与 `docs/project-map.md` 在每次升级收尾时一起刷新提交。

## 当前基线

- 上游版本：`dsh-v0.1.2-alpha.5`
- 本地基线：alpha.5 合并提交 `2da10a3184`，地图刷新提交 `a4ed9ef610`（`docs/project-map.md` base_ref = `2da10a3184`）
- 根 `package.json` 与本地独有包 `@deepseek-ai/dsh-client-ui-handoff` 版本均为 `0.1.2-alpha.5`

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

alpha.4 之后的本地演进提交（每次都要一并移植）：ui-handoff alpha.4 适配 `19d13dfca0`、minimal-turbo enhanced 重构 `280c931dd9`、版本对齐（本次 `7520c20fa0`）。

## 每次升级流程（alpha.N）

1. **冲突预检（动手前必做）**
   - `git fetch --tags --prune origin`
   - 上游改动文件集：`git diff --name-status dsh-v0.1.2-alpha.(N-1) dsh-v0.1.2-alpha.N`
   - 取交集：`tsconfig.base.json`、`pnpm-lock.yaml`、`packages/bundle/web-app/package.json`、`packages/bundle/web-app/cordis.patch.yml`、`packages/core/tools/package.json`、`packages/client/package.json` 等
   - API 契约核对：slot 声明（`conversation.input.right` 等）、`SessionEventWindow`/`SessionSnapshot`、invariant 配套规则、corner-shape 规则、`send_message`/`Session.events`、storage 域格式；重点是 API 漂移而非文件重叠。
2. **保全 WIP**：`git stash push --include-untracked -m "wip: <说明>"`，确认 `git status` 干净；用户的 WIP 未经确认不提交，升级后必定 `stash pop` 恢复。
3. **建升级分支**：`git checkout -b upgrade/alpha.N dsh-v0.1.2-alpha.N`
4. **重放定制**：`git cherry-pick 923f10a725 24ed64842f b8346e431f db90c5b976 d5b8b02bfb 2a5fdaaf21`；冲突统一取升级分支侧（它包含全部本地定制 + 新上游）。
5. **补本地演进**：依序 cherry-pick `19d13dfca0`（alpha.4 适配）、`280c931dd9`（enhanced 重构）；目标：`git diff master upgrade/alpha.N` 只剩上游 alpha.(N-1)→alpha.N 的差异 + `docs/project-map.md`。
6. **版本对齐**：本地独有包（目前仅 `packages/client/ui-handoff/package.json`）版本 `alpha.(N-1)` → `alpha.N`，提交 `chore(ui-handoff): align package version with alpha.N`。
7. **全量验证**（见下节）。
8. **合并回 master**：`git checkout master && git merge --no-ff upgrade/alpha.N -m "Merge branch 'upgrade/alpha.N'"`；add/add 冲突规则：ui-handoff 包取升级侧（`git checkout --theirs`），`docs/project-map.md` 保留 master 侧（`git checkout --ours`）稍后刷新。
9. **恢复 WIP**：`git stash pop`（应无冲突；若有冲突只处理用户文件，不覆盖用户内容）。
10. **刷新地图**：`docs/project-map.md` 的 base_ref 改为合并提交哈希、更新说明行，提交 `docs(project-map): refresh base_ref after alpha.N upgrade`。
11. **推送**：`git push fork master upgrade/alpha.N upgrade/alpha.(N-1) ...`（经用户确认后执行）。

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

发布级可选：`DSH_SNAPSHOT=replay pnpm run test:web`（UI 无改动时可跳过）。alpha.5 基线：285 文件 / 3924 测试 / 1 skip，零失败。

## 已知坑（历史教训）

- **不要往 `src/` 落编译产物**（`*.js`/`*.d.ts`/`*.map`）：残留产物会被模块解析命中，`test:gui` 报 `TypeError: brandNumber is not a function`；用 `git status --porcelain` 过滤清理，且今后不在 `src` 下生成产物。
- **invariant 删除后的 README 原因句**必须匹配 `No invariant companion is published because ...`（反引号写法不匹配 `verify-package-invariants` 正则）。
- **全圆角/胶囊**必须 `border-radius` ≥ 99px 与 `corner-shape: round` 同规则配对（ui-theme 测试拦截）。
- **上游已吸收的补丁**：alpha.3/4 上游已内置单参 `ToolArgsError(violations)`；本地双参版本是独有增量，若上游未来吸收才可删除本地版本。
- **推送注意**：`origin` 是上游只读；推送一律走 `fork`。历史遗留 `stash@{0}`（旧 ToolArgsError 补丁）内容已随提交落地，未拍板删除前不要动。