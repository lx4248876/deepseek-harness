# dsh-minimal-turbo

Deepseek Harness 极简模式 / 增强模式 Windows 适配，享用满血 Deepseek-V4 系列模型。

## 背景

经多次验证，`Let me` 思考链并不是"拉"的原因，`We need` 思考链同样会产出"拉"的结果。真正的原因大概是首轮思考直接进入雷霆思考（长时间思考），陷入闭门造车工作流。

基于这个现象开发了**增强模式**（原「精简许愿模式」）：工具链对齐官方标准模式，提示词使用"专武"强化，添加了首轮思考约束，使首轮高概率以最简短方式思考；再结合一些 PUA，让模型多想、多想、多想。

> **注意**：覆盖保存后，记得**重启 dsh**，再选择对应模式重新开任务。
>
> **已知问题**：一 shot 可能会报错（语法错误或引用错误），把报错复制给模型，第二轮基本直接成功。

## 模式对比

| 特性 | minimal（极简模式） | enhanced（增强模式） |
| --- | --- | --- |
| 基于 | 官方极简模式配置，兼容 Windows | 官方标准模式工具链，新增独立模式 |
| 核心思路 | 最少开销、最快响应 | 打断首次思考，防止直接雷霆思考 |
| 思考链 | 无上下文压缩，思考轮次少 | 系统提示词约束首轮快速跳过，`Let me` 起手不影响效果 |
| 适用场景 | 纯文件编辑 / 命令行操作的简单任务 | 复杂、多步骤任务，追求高质量输出 |
| 安装方式 | 覆盖官方预设 | 新增目录，不影响官方预设 |

## 快速开始

### 一键安装脚本

自动定位 dsh 安装目录（优先 npm 全局安装目录，回退到当前目录 `node_modules`），备份现有配置后，将本仓库配置复制到运行环境对应目录。

**Windows（PowerShell）**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-minimal.ps1
powershell -ExecutionPolicy Bypass -File scripts\install-enhanced.ps1
```

**Linux（bash）**

```bash
bash ./scripts/install-minimal.sh   # 覆盖官方极简模式
bash ./scripts/install-enhanced.sh  # 安装增强模式
```

安装目录不在默认位置时：

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File scripts\install-minimal.ps1 -DshPath "D:\path\to\dsh"
powershell -ExecutionPolicy Bypass -File scripts\install-enhanced.ps1 -DshPath "D:\path\to\dsh"
```

```bash
# Linux
DSH_PATH=/path/to/dsh bash ./scripts/install-minimal.sh
DSH_PATH=/path/to/dsh bash ./scripts/install-enhanced.sh
```

脚本执行时会自动将原 `agent.cordis.yml`（enhanced 脚本含 `preset.yml`）备份为 `*.bak-<时间戳>`（位于原目录），可随时手动恢复。

### 手动安装

**minimal**

1. 进入 nodejs 包管理目录 `node_modules`
2. 打开 `@deepseek-ai\dsh\config\agent-presets\minimal`
3. 用本仓库 [`minimal/agent.cordis.yml`](minimal/agent.cordis.yml) 的内容覆盖 `agent.cordis.yml`

**enhanced（增强模式）**

1. 将本仓库 [`enhanced`](enhanced) 目录整个复制到目标预设根下，内含 `agent.cordis.yml` 和 `preset.yml`，目录名即模式 id `enhanced`
2. 新开会话后，在模式选择中即可看到「增强模式」

### 预设目录速查

dsh 从多个根发现 agent 预设；一个预设就是一个目录，内含 `agent.cordis.yml`（组合），可选 `preset.yml`(显示名/描述/排序)。同名 id 时先列出的根优先：

| 优先级 | 位置 | 路径 | 说明 |
| --- | --- | --- | --- |
| 1 | 源码运行（仓库内） | 仓库 `apps/cli/config/agent-presets/<preset>/` | 从本仓库源码启动 dsh 时随包分发的官方预设（code/cordis/minimal/standard） |
| 1 | npm 安装目录 | `<dsh 安装目录>/config/agent-presets/<preset>/` | 上方一键脚本写入的位置 |
| 2（兜底） | **用户级** | `$DSH_HOME/.agent-presets/<preset>/`，未设 `DSH_HOME` 时为 `~/.dsh/.agent-presets/<preset>/` | 本机实际使用：`C:\Users\Administrator\.dsh\.agent-presets\`，已装有 `enhanced` |

- 发现是每次调用重新扫描：改完文件后**新开会话**即可生效，无需重启进程；已开启的会话不会切换预设。
- 本仓库 `dsh-minimal-turbo/` 是这些配置的修改源头；改完后需手动同步到上表的目标目录（用户级或安装目录）。

## 效果展示

增强模式下（原许愿模式）完成的真实案例（见 [`enhanced-demo`](enhanced-demo) 目录，含单文件 HTML 成品与原始 prompt）：

| 案例 | Flash Max | Pro Max |
| --- | --- | --- |
| Kerr-Newman 黑洞 WebGL 渲染（raymarching + 体积吸积盘 + 后处理） | [查看](enhanced-demo/kerr-newman-with-flash-max/kerr_newman.html) | [查看](enhanced-demo/kerr-newman-with-pro-max/kerr_newman.html) |
| 我的世界风格 3D 游戏 | [查看](enhanced-demo/minecraft-with-flash-max/minecraft.html) | [查看](enhanced-demo/minecraft-with-pro-max/minecraft.html) |

## 目录结构

```
dsh-minimal-turbo/
├── minimal/                 # 极简模式配置（覆盖官方 minimal 预设）
│   └── agent.cordis.yml
├── enhanced/                # 增强模式配置（独立新增预设：强化提示词 + 标准工具链）
│   ├── agent.cordis.yml
│   └── preset.yml
├── scripts/                 # 一键安装脚本（Windows / Linux）
├── enhanced-demo/           # 增强模式效果展示案例
└── README.md
```

## 变更记录

- 2026-08-25：`wish-lite` 补回 `skill-filesystem` 与 `tool-skill` 两行，精简许愿模式恢复 skill 能力。原因：初始裁剪时把整个 skills 区块连同其他工具一起删除，而部署组合里 host 层的这两行默认禁用（由预设自行挂载，见 `packages/bundle/web-app/cordis.patch.yml`），导致工具目录中没有 `skill` 工具。已同步到本机用户级目录 `C:\Users\Administrator\.dsh\.agent-presets\wish-lite\agent.cordis.yml`，原文件备份为 `agent.cordis.yml.bak-20260825-104703`。
- 2026-08-31：`wish-lite` 补齐完整工具链（后台任务、目标、子代理、工作流、网页检索），与标准模式工具链对齐。原因与 2026-08-25 的 skills 问题同类：初始裁剪时未带入 `delegation and workflows` 等区块，而 Web 宿主组合默认禁用这些工具行（`packages/bundle/web-app/cordis.patch.yml`），导致精简许愿模式没有 `subagent`/`subagent_fork` 等工具。已同步到本机用户级目录 `C:\Users\Administrator\.dsh\.agent-presets\wish-lite\agent.cordis.yml`（同目录 `preset.yml` 描述一并更新）。
- 2026-08-31：删除 `wish`（许愿模式）预设，`wish-lite`（精简许愿模式）更名为 `enhanced`（增强模式）。提示词沿用原强化设定，工具链保持与标准模式对齐；模式 id 与目录统一为 `enhanced`，安装脚本更名为 `scripts/install-enhanced.ps1` / `scripts/install-enhanced.sh`，示例目录更名为 `enhanced-demo`。已同步本机用户级目录：删除 `C:\Users\Administrator\.dsh\.agent-presets\wish`，`wish-lite` 目录移动为 `C:\Users\Administrator\.dsh\.agent-presets\enhanced`。

## License

[MIT](LICENSE)
