# 本地形态迁移说明（fork 跟版 → 官方安装 + 插件）

本文件记录本机 `dsh` 从「fork 源码跟版」迁到「官方 `@deepseek-ai/dsh` 全局安装 + 本地功能以 profile 插件/预设接入」的实际形态、各项本地定制的去处、重建步骤与回退方式。`UPGRADE.md` 描述的 fork 重放流程是迁移前的旧形态，逐步被本文件取代。

## 目标形态

- **运行时**：官方 npm 包全局安装，`dsh` 命令直接可用；跟版只需重装新版本号。
- **本地功能**：走官方扩展点接入，不再依赖 fork 源码。
  - agent 预设 → `$DSH_HOME/.agent-presets/<id>/`
  - client/host 插件 → `dsh plugin --profile <name> add <包>` 装进 profile，再在 profile 的 `cordis.patch.yml` 加挂载行
  - 无法用扩展点表达的核心补丁 → 留在 fork，作为补丁源单独维护

## 已落地

| 项 | 位置 | 说明 |
|---|---|---|
| 官方运行时 | `npm i -g @deepseek-ai/dsh@0.1.5-rc.1` | bin 在 `C:\nvm4w\nodejs\dsh.cmd`；`dsh --version` = `0.1.5-rc.1` |
| web profile | `C:\Users\Administrator\.dsh\profiles\web` | bundles = `@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app`、`server-info`；`patchReload: live` |
| `enhanced` 预设 | `C:\Users\Administrator\.dsh\.agent-presets\enhanced\` | 以 0.1.5 官方 `standard` 工具链为基底 + 本地强化 persona（`complete: true`，`text:` 已按上游破坏性变更改为 `prefix:`） |
| `ui-handoff` 插件 | 包 tarball 在 `C:\A-codes\lix\dsh-plugins\`；profile 依赖 + `cordis.patch.yml` 的 `insert` 行 | 走 `dsh plugin --profile web add` 安装；浏览器 roster 由 profile patch 的顶层 `insert` 提供 |
| `ui-archived` 面板插件 | 同上（新包 `packages/client/ui-archived/`） | 用 rc.1 的全局面板 API（`main` 单元 key `archived` + `sidebar.panellist` 行）实现归档视图与复制会话 ID，无需打补丁任何已发布包 |
| fork 基线分支 | `upgrade/0.1.5-rc.1` | `dsh-v0.1.5-rc.1` + 本地定制提交（8 个原有 + 预设重建 + 版本对齐 + 文档门禁修复 + 两个插件包）；`typecheck` 与 `test:gui` 双绿、`doc-sync` 34 门全绿 |
| 迁移前备份 | `C:\Users\Administrator\Desktop\dsh-backup-20260910-133921` | `~/.dsh` 整份（sessions / storages / .agent-presets / profiles / 密钥 / 设置），1.6 GB |

## 重建步骤

预设（改完 `dsh-minimal-turbo/enhanced/` 后同步）：

```powershell
Copy-Item dsh-minimal-turbo\enhanced\agent.cordis.yml "$env:USERPROFILE\.dsh\.agent-presets\enhanced\agent.cordis.yml" -Force
Copy-Item dsh-minimal-turbo\enhanced\preset.yml       "$env:USERPROFILE\.dsh\.agent-presets\enhanced\preset.yml" -Force
```

插件（改完 `packages/client/ui-handoff/` 后重打包并重装）：

```powershell
pnpm --filter @deepseek-ai/dsh-client-ui-handoff bundle
pnpm --filter @deepseek-ai/dsh-client-ui-handoff pack --pack-destination C:\A-codes\lix\dsh-plugins
dsh plugin --profile web add "C:\A-codes\lix\dsh-plugins\deepseek-ai-dsh-client-ui-handoff-0.1.5-rc.1.tgz" --store-dir "C:\Users\Administrator\AppData\Roaming\@deepseek-ai\dsh-desktop\plugin-store\v11"
```

跟版（官方运行时升级）：

```powershell
npm install -g @deepseek-ai/dsh@<新版本>
```

随后重建插件包（client bundle 必须与该版本 shell 的模块表匹配）并重装，再重启 `dsh web`。

## 本机注意点

- **`dsh plugin` 必须显式给 `--store-dir`**：本 profile 的 `node_modules` 由 dsh-desktop 用它自带的 store（`AppData\Roaming\@deepseek-ai\dsh-desktop\plugin-store\v11`）安装，CLI 的默认 store 与之不同，不加该参数会报 `ERR_PNPM_UNEXPECTED_STORE`。
- **profile 的 `bundles` 不允许断链项**：解析发生在 `disabledBundles` 过滤之前，所以一个指向已删除目录的 bundle 会让整个 profile 启动失败；`dsh-ssh-panel` 已因此从列表移除（其源码目录 `C:\A-codes\lix\test\dsh-ssh-panel` 已不存在）。
- **两个实例可并存**：fork 源码版（`pnpm dsh --profile web`，3080）与官方版（`dsh web --port 3081`）共用同一个 `$DSH_HOME`，会话与设置互通。
- **Session 格式升到 V3**：0.1.5 打开旧会话时生成新版日志并保留原文件，升级后的会话不支持降级读取；跨版本回退只能用迁移前的备份。

## 待决与未完成

| 项 | 状态 |
|---|---|
| archived 视图 / 复制会话 ID | **已迁移**：`packages/client/ui-archived/` 用 rc.1 全局面板 API 做成纯插件，已在官方实例验收（侧栏「已归档会话」列出 105 个会话，复制会话 ID 动作可用） |
| archived 恢复（unarchive） | **待上游**。registry 只有 `archiveSession`，没有取消归档的操作；按决定提上游 PR，本机在 PR 落地前无法恢复归档会话（仅能查看与复制 ID） |
| `ToolArgsError` 双参补丁 | **已决定放弃**（小 DX 改进，不值得为 `@deepseek-ai/dsh-tools` 引入补丁包与双实例风险），官方运行时按上游单参行为运行 |
| `minimal` 预设 override | **建议退役**。上游 rc.1 的 minimal 已原生按平台分流（`!!js process.platform` 门控 + pwsh 孪生行），本地 override 的存在理由已被上游吸收；未从仓库删除，待确认 |
| `dsh-pack.bat` | 保持现状（纯打包脚本，与运行形态无关） |
| fork 分支推送 | `upgrade/0.1.5-rc.1` 仅存本地，尚未推送 `fork` |
| 面板测试 | `packages/client/ui-archived/` 暂无套件；仓库的覆盖率门禁按 per-file 100% 要求，补测试前该包不在 CI 覆盖内 |
