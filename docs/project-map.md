# 项目骨架地图

## 元信息
- base_ref: `a4eaf21ebd`（master HEAD；0.1.3-alpha.1 升级合并后）
- 更新说明: 增量更新（0.1.3-alpha.1 升级后核对：目录职责/关键链路仍准确；session v2 格式迁移、file-upload 新特性、ui-workspace search-reveal 重构，本地定制不受影响）

## 目录职责
| 路径 | 一句话职责 |
|------|------------|
| `packages/core/` | 产品 API 主脊：session、system-prompt、tools、agent、agent-loop |
| `packages/api/` | Remote BFF 组装与 Typert RPC 网关 |
| `packages/llm/` | LLM 能力（Service Definition/Consumer）与 DeepSeek providers |
| `packages/client/` | Web 客户端插件包：一个 UI 特性一个包，`web/` 为平台壳 |
| `packages/bundle/` | 可安装的 `dsh --profile` 补丁层 bundle（`web-app` 聚合 client 行） |
| `packages/session/` | 持久会话数据：persistence、projection、titles、telemetry |
| `packages/skill/` | 技能 provider 注册 + local 实现 + catalog/loader 工具 |
| `packages/sdk/` | JSON-RPC 协议 + TypeScript client/server |
| `vendor/` | Vendored Cordis 源码（manifest + sync 见 `vendor/README.md`） |
| `docs/` | 架构、子系统、cookbook、后记（`docs/AGENTS.md` 掌管规范） |
| `.agents/` | 代理工作流技能与 Agent Notes（`notes/`） |
| `scripts/` | 仓库门禁与生成器 |
| `apps/` | 应用入口（`apps/cli` 等） |
| `dsh-minimal-turbo/` | 本地预设工具包：`minimal`/`enhanced` 预设与一键安装脚本 |

## 主入口
- `pnpm dsh --profile headless "task"` — 单任务运行（需 `DEEPSEEK_API_KEY`）
- `pnpm dsh --profile web` — 启动 Web 客户端（webserver 监听 `127.0.0.1:3080`）
- `pnpm run test:gui` — GUI 内环（秒级；client 套件 + host 侧 GUI 包）
- `pnpm exec vitest run <path>` — 定向 Vitest 运行
- `pnpm --filter <pkg> bundle` — 重建单包 client bundle（探活 `dsh web` 前必须执行）

## 关键链路
| 链路名 | 从哪进 | 主要落点 | 一句话 |
|--------|--------|----------|--------|
| Web client 插件组装 | `tsconfig.client.json` 引用 + `packages/bundle/web-app/cordis.patch.yml` 行 | `packages/client/*/src/client` + `web-app` | 每个 UI 特性一个插件包，经 `slots.register` 进入组合 |
| UI slot 组合 | `ui-conversation` 声明 composer/chat 行 | `packages/client/ui-conversation`、`ui-slots`、`ui-renderer` | 子插件只贡献 entry，不声明他人 slot |
| Handoff 交接动作 | composer 工具行「交接」按钮 | `packages/client/ui-handoff/src/client/handoff.ts` + `HandoffButton.tsx` | 调 handoff 技能 → 提取交接包 → 新会话继续 → 归档源会话 |

## 与任务级产物的边界
- 单次需求的文件表、base_ref 细表 → 写在 spec 的 Code Map 或交接包，不塞进本地图。
- 当前任务（`ui-handoff`）的改动/验证/提交决策 → 见交接包正文，不写进地图。