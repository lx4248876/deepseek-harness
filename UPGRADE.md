# 本地分叉升级指南（已退役）

> **本文件描述的 fork 重放流程已退役。** 当前形态与操作步骤见 [`MIGRATION.md`](MIGRATION.md)：运行时改为官方 `@deepseek-ai/dsh` 全局安装，本地功能经 profile 插件与用户级预设接入，不再在 fork 上重放提交。本页只保留历史记录，供回溯当时的做法。

## 历史记录

本机此前按「上游 tag → `upgrade/<tag>` 分支 → 重放本地定制提交 → 版本对齐 → 合并回 `master` → 推送 `fork`」的方式跟版，共执行三次：

| 时间 | 版本 | 落点 |
|---|---|---|
| 2026-09 | `dsh-v0.1.2-rc.1` | `upgrade/rc.1` 分支、`master` 合并 |
| 2026-09 | `dsh-v0.1.3-alpha.1` | `upgrade/0.1.3-alpha.1` 分支、`master` 合并 |
| 2026-09 | `dsh-v0.1.3-alpha.2` | `upgrade/0.1.3-alpha.2` 分支、`master` 合并 `6e59696451` |
| 2026-09-10 | `dsh-v0.1.5-rc.1` | `upgrade/0.1.5-rc.1` 分支（rc.1 + 本地定制重放），并在此之上完成官方安装迁移 |

本地定制在重放中的落点（现均已改为官方扩展点，见 `MIGRATION.md`）：

- `ToolArgsError` 双参补丁 —— 现按决定放弃，官方运行时使用上游单参行为。
- `dsh-minimal-turbo` 预设工具包 —— 现只保留 `enhanced`，装入 `$DSH_HOME/.agent-presets/enhanced/`；`minimal` override 已随上游原生平台门控退役。
- `dsh-pack.bat` —— 纯打包脚本，与运行形态无关，保持现状。
- `ui-handoff` 交接插件 —— 现为 profile 插件包。
- archived 视图 / 恢复 / 复制会话 ID —— 视图与复制已做成 `ui-archived` 面板插件；恢复的 host 能力以独立 PR 分支 `feat/workspace-unarchive` 准备提交上游。

重放期踩过、后来写进 `MIGRATION.md` 与各包文档的坑（历史教训，供同类工作参考）：上游改动文件集与本地定制文件的交集需要提前算清；双语配对门禁要求本地文档补齐 `*.md` + `*.zh.md` + `*.i18n.yaml` 三件套并逐字节统一代码围栏；生成的 client/config catalog 会在本地包增删后过期；Windows 上的 e2e 金样归一化需要按 `[\\/]` 切分路径。
