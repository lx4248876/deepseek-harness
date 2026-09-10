# dsh-minimal-turbo

[English](README.md) | 中文

面向 DeepSeek Harness 的增强模式预设，让满血 Deepseek-V4 系列模型在 Windows 上按任务导向的思考节奏工作。

## 背景

经多次验证，`Let me` 思考链并不是"拉"的原因，`We need` 思考链同样会产出"拉"的结果。真正的原因大概是首轮思考直接进入雷霆思考（长时间思考），陷入闭门造车工作流。

**增强模式**正是针对这个现象开发的：工具链对齐官方标准模式，提示词使用"专武"强化，并加入首轮思考约束，使首轮高概率以最简短方式思考；再结合一些 PUA，让模型多想、多想、多想。

> **注意**：覆盖保存后，记得**重启 dsh**，再选择对应模式重新开任务。
>
> **已知问题**：一 shot 可能会报错（语法错误或引用错误），把报错复制给模型，第二轮基本直接成功。

## 模式对比

| 特性 | standard（官方内置） | enhanced（本工具包） |
| --- | --- | --- |
| 基于 | 官方标准模式工具链 | 同一套工具链，外加强化 persona |
| 提示词 | 部署级 persona 前缀/后缀 | `complete: true` 的完整强化提示词，带首轮思考约束 |
| 思考链 | 无首轮约束 | 提示词让首轮快速跳过，`Let me` 起手不影响效果 |
| 适用场景 | 使用默认身份的通用任务 | 复杂、多步骤任务，追求高质量输出 |
| 安装方式 | 随 dsh 内置 | 独立预设目录，不影响官方预设 |

## 快速开始

### 一键安装脚本

脚本自动定位 dsh 的预设根目录（优先 npm 安装目录，回退到当前目录 `node_modules`），备份现有配置后，把本工具包的预设复制到用户预设根。

**Windows（PowerShell）**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-enhanced.ps1
```

**Linux（bash）**

```bash
bash ./scripts/install-enhanced.sh  # install enhanced mode
```

预设根不在默认位置时：

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File scripts\install-enhanced.ps1 -DshPath "D:\path\to\dsh"
```

```bash
# Linux
DSH_PATH=/path/to/dsh bash ./scripts/install-enhanced.sh
```

脚本执行时会自动把已有的 `preset.yml` 与 `agent.cordis.yml` 备份为 `*.bak-<时间戳>`（位于原目录），可随时手动恢复。

### 手动安装

1. 将本仓库 [`enhanced`](enhanced) 目录整个复制到 `$DSH_HOME/.agent-presets/` 下；内含 `agent.cordis.yml` 和 `preset.yml`，目录名即模式 id `enhanced`
2. 新开会话后，在模式选择中即可看到「增强模式」

### 预设目录速查

dsh 从多个根发现 agent 预设；一个预设就是一个目录，内含 `agent.cordis.yml`（组合），可选 `preset.yml`（显示名/描述/排序）。同名 id 时先列出的根优先：

| 优先级 | 位置 | 路径 | 说明 |
| --- | --- | --- | --- |
| 1 | 源码运行（仓库内） | 仓库 `packages/preset/agent-presets/presets/<preset>/` | 当前运行的 dsh 随包分发的预设 |
| 1 | npm 安装目录 | `<dsh 安装目录>/config/agent-presets/<preset>/` | npm 包挂载其内置预设的位置 |
| 2（兜底） | **用户级** | `$DSH_HOME/.agent-presets/<preset>/`，未设 `DSH_HOME` 时为 `~/.dsh/.agent-presets/<preset>/` | 本机实际使用：`C:\Users\Administrator\.dsh\.agent-presets\`，已装有 `enhanced` |

- 发现是每次调用重新扫描：改完文件后**新开会话**即可生效，无需重启进程；已开启的会话不会切换预设。
- 本仓库 `dsh-minimal-turbo/` 是该预设的修改源头；改完后需手动同步到上表的用户级目录。

## 效果展示

增强模式下完成的真实案例（见 [`enhanced-demo`](enhanced-demo) 目录，含单文件 HTML 成品与原始 prompt）：

| 案例 | Flash Max | Pro Max |
| --- | --- | --- |
| Kerr-Newman 黑洞 WebGL 渲染（raymarching + 体积吸积盘 + 后处理） | [查看](enhanced-demo/kerr-newman-with-flash-max/kerr_newman.html) | [查看](enhanced-demo/kerr-newman-with-pro-max/kerr_newman.html) |
| 我的世界风格 3D 游戏 | [查看](enhanced-demo/minecraft-with-flash-max/minecraft.html) | [查看](enhanced-demo/minecraft-with-pro-max/minecraft.html) |

## 目录结构

```
dsh-minimal-turbo/
├── enhanced/                # enhanced-mode configuration (its own preset: reinforced prompt + standard toolchain)
│   ├── agent.cordis.yml
│   └── preset.yml
├── scripts/                 # one-click install scripts (Windows / Linux)
├── enhanced-demo/           # enhanced-mode result showcase
└── README.md
```

## 变更记录

- 2026-08-25：`wish-lite` 补回 `skill-filesystem` 与 `tool-skill` 两行，精简许愿模式恢复 skill 能力。原因：初始裁剪时把整个 skills 区块连同其他工具一起删除，而部署组合里 host 层的这两行默认禁用，导致工具目录中没有 `skill` 工具。
- 2026-08-31：`wish-lite` 补齐完整工具链（后台任务、目标、子代理、工作流、网页检索），与标准模式工具链对齐。原因与 2026-08-25 的 skills 问题同类：初始裁剪时未带入 `delegation and workflows` 等区块，而 Web 宿主组合默认禁用这些工具行。
- 2026-08-31：删除 `wish` 预设，`wish-lite` 更名为 `enhanced`，模式 id 与目录统一为 `enhanced`。
- 2026-09-10：退役 `minimal` override 及其安装脚本。官方 minimal 预设现已按平台门控其 shell 栈（`!!js process.platform`），正是本地 override 存在的理由，因此本工具包只保留 `enhanced`。

## License

[MIT](LICENSE)
