# dsh-minimal-turbo

English | [中文](README.zh.md)

An enhanced agent preset for the DeepSeek Harness, so the full Deepseek-V4 model series works in a task-oriented reasoning rhythm on Windows.

## Background

Repeated testing shows that a `Let me` reasoning chain is not what causes "lazy" answers: a `We need` chain produces the same result. The real cause is roughly that the first reasoning round goes straight into a long "thunder" deliberation and ends up in a closed-door workflow.

**Enhanced mode** was built for this phenomenon: the toolchain matches the official standard mode, the prompt uses a purpose-built reinforcement, and a first-round reasoning constraint makes the first round think in the shortest form with high probability; some pressure then pushes the model to think more, more, more.

> **Note**: after overwriting and saving, remember to **restart dsh**, then pick the corresponding mode and start a new task.
>
> **Known issue**: a one-shot answer may fail (syntax or reference error); copy the error back to the model and the second round usually succeeds outright.

## Mode comparison

| Aspect | standard (shipped) | enhanced (this kit) |
| --- | --- | --- |
| Based on | The official standard-mode toolchain | The same toolchain, plus a reinforced persona |
| Prompt | The deployment persona prefix/suffix | A complete reinforced prompt (`complete: true`) with a first-round reasoning constraint |
| Reasoning chain | No first-round constraint | The prompt makes the first round skip quickly, so a `Let me` opening does not hurt the result |
| Best for | General tasks with the default identity | Complex, multi-step tasks where output quality matters |
| Install | Shipped with dsh | Its own preset directory; the shipped presets stay untouched |

## Quick start

### One-click install script

The script locates the dsh preset root automatically (the npm installation first, falling back to the current directory `node_modules`), backs up the existing configuration, then copies this kit's preset into the user preset root.

**Windows (PowerShell)**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-enhanced.ps1
```

**Linux (bash)**

```bash
bash ./scripts/install-enhanced.sh  # install enhanced mode
```

When the preset root is not in its default location:

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File scripts\install-enhanced.ps1 -DshPath "D:\path\to\dsh"
```

```bash
# Linux
DSH_PATH=/path/to/dsh bash ./scripts/install-enhanced.sh
```

While running, the script backs up any existing `preset.yml` and `agent.cordis.yml` as `*.bak-<timestamp>` in the same directory, so the original can be restored by hand at any time.

### Manual install

1. Copy this repository's [`enhanced`](enhanced) directory as a whole into `$DSH_HOME/.agent-presets/`; it contains `agent.cordis.yml` and `preset.yml`, and the directory name is the mode id `enhanced`
2. Start a new session and "enhanced mode" appears in the mode picker

### Preset directory reference

dsh discovers agent presets from several roots; one preset is one directory holding `agent.cordis.yml` (composition) and an optional `preset.yml` (display name/description/order). When the same id exists more than once, the root listed first wins:

| Priority | Location | Path | Notes |
| --- | --- | --- | --- |
| 1 | Source run (inside the repository) | Repository `packages/preset/agent-presets/presets/<preset>/` | The presets shipped with the running dsh |
| 1 | npm installation directory | `<dsh installation directory>/config/agent-presets/<preset>/` | Where the npm package mounts its shipped presets |
| 2 (fallback) | **User level** | `$DSH_HOME/.agent-presets/<preset>/`, or `~/.dsh/.agent-presets/<preset>/` without `DSH_HOME` | On this machine: `C:\Users\Administrator\.dsh\.agent-presets\`, which holds `enhanced` |

- Discovery rescans on every call: after editing files, **starting a new session** is enough — no process restart — and an already open session never switches preset.
- This repository's `dsh-minimal-turbo/` is the source of edits for this preset; after editing, sync it by hand into the user-level directory above.

## Results

Real cases completed in enhanced mode — see the [`enhanced-demo`](enhanced-demo) directory for the single-file HTML results and the original prompts:

| Case | Flash Max | Pro Max |
| --- | --- | --- |
| Kerr-Newman black hole WebGL rendering (raymarching + volumetric accretion disk + post-processing) | [View](enhanced-demo/kerr-newman-with-flash-max/kerr_newman.html) | [View](enhanced-demo/kerr-newman-with-pro-max/kerr_newman.html) |
| Minecraft-style 3D game | [View](enhanced-demo/minecraft-with-flash-max/minecraft.html) | [View](enhanced-demo/minecraft-with-pro-max/minecraft.html) |

## Directory structure

```
dsh-minimal-turbo/
├── enhanced/                # enhanced-mode configuration (its own preset: reinforced prompt + standard toolchain)
│   ├── agent.cordis.yml
│   └── preset.yml
├── scripts/                 # one-click install scripts (Windows / Linux)
├── enhanced-demo/           # enhanced-mode result showcase
└── README.md
```

## Change log

- 2026-08-25: `wish-lite` regained the `skill-filesystem` and `tool-skill` rows, restoring skill capability in lite wish mode. Cause: the initial trim removed the whole skills block together with other tools, while the deployed composition disables those two host rows by default, so the tool catalog had no `skill` tool.
- 2026-08-31: `wish-lite` regained the complete toolchain (background jobs, goals, subagents, workflows, web search) to match the standard-mode toolchain. The cause is the same class of problem as the skills issue of 2026-08-25: the initial trim dropped blocks such as `delegation and workflows`, and the Web host composition disables those tool rows by default.
- 2026-08-31: The `wish` preset was deleted and `wish-lite` was renamed to `enhanced`, with the mode id and directory both `enhanced`.
- 2026-09-10: The `minimal` override was retired, together with its install scripts. The shipped minimal preset gates its shell stack per platform (`!!js process.platform`), which was the reason the local override existed, so this kit carries `enhanced` alone.

## License

[MIT](LICENSE)
