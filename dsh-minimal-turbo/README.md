# dsh-minimal-turbo

English | [中文](README.zh.md)

Windows adaptation of the Deepseek Harness minimal and enhanced modes, for running the full Deepseek-V4 model series.

## Background

Repeated testing shows that a `Let me` reasoning chain is not what causes "lazy" answers: a `We need` chain produces the same result. The real cause is roughly that the first reasoning round goes straight into a long "thunder" deliberation and ends up in a closed-door workflow.

**Enhanced mode** (originally named "lite wish mode") was built for this phenomenon: the toolchain matches the official standard mode, the prompt uses a purpose-built reinforcement, and a first-round reasoning constraint makes the first round think in the shortest form with high probability; some pressure then pushes the model to think more, more, more.

> **Note**: after overwriting and saving, remember to **restart dsh**, then pick the corresponding mode and start a new task.
>
> **Known issue**: a one-shot answer may fail (syntax or reference error); copy the error back to the model and the second round usually succeeds outright.

## Mode comparison

| Aspect | minimal (minimal mode) | enhanced (enhanced mode) |
| --- | --- | --- |
| Based on | The official minimal-mode configuration, Windows-compatible | The official standard-mode toolchain, added as its own mode |
| Core idea | Least overhead, fastest response | Interrupt the first reasoning round before it goes straight into a thunder deliberation |
| Reasoning chain | No context compaction, few reasoning rounds | The system prompt constrains the first round to skip quickly, so a `Let me` opening does not hurt the result |
| Best for | Simple tasks of pure file editing or command-line work | Complex, multi-step tasks where output quality matters |
| Install | Overwrite the official preset | New directory; the official presets stay untouched |

## Quick start

### One-click install scripts

The scripts locate the dsh installation directory automatically (the npm global installation first, falling back to `node_modules` in the current directory), back up the existing configuration, then copy this repository's configuration into the corresponding directory of the running environment.

**Windows (PowerShell)**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-minimal.ps1
powershell -ExecutionPolicy Bypass -File scripts\install-enhanced.ps1
```

**Linux (bash)**

```bash
bash ./scripts/install-minimal.sh   # overwrite the official minimal mode
bash ./scripts/install-enhanced.sh  # install enhanced mode
```

When the installation directory is not in its default location:

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

While running, the scripts back up the existing `agent.cordis.yml` (and, for the enhanced script, `preset.yml`) as `*.bak-<timestamp>` in the same directory, so the original can be restored by hand at any time.

### Manual install

**minimal**

1. Enter the nodejs package management directory `node_modules`
2. Open `@deepseek-ai\dsh\config\agent-presets\minimal`
3. Overwrite `agent.cordis.yml` with this repository's [`minimal/agent.cordis.yml`](minimal/agent.cordis.yml)

**enhanced (enhanced mode)**

1. Copy this repository's [`enhanced`](enhanced) directory as a whole under the target preset root; it contains `agent.cordis.yml` and `preset.yml`, and the directory name is the mode id `enhanced`
2. Start a new session and "enhanced mode" appears in the mode picker

### Preset directory reference

dsh discovers agent presets from several roots; one preset is one directory holding `agent.cordis.yml` (composition) and an optional `preset.yml` (display name/description/order). When the same id exists more than once, the root listed first wins:

| Priority | Location | Path | Notes |
| --- | --- | --- | --- |
| 1 | Source run (inside the repository) | Repository `apps/cli/config/agent-presets/<preset>/` | The official presets shipped with the repository source (code/cordis/minimal/standard) |
| 1 | npm installation directory | `<dsh installation directory>/config/agent-presets/<preset>/` | Where the one-click scripts above write |
| 2 (fallback) | **User level** | `$DSH_HOME/.agent-presets/<preset>/`, or `~/.dsh/.agent-presets/<preset>/` without `DSH_HOME` | On this machine: `C:\Users\Administrator\.dsh\.agent-presets\`, which holds `enhanced` |

- Discovery rescans on every call: after editing files, **starting a new session** is enough — no process restart — and an already open session never switches preset.
- This repository's `dsh-minimal-turbo/` is the source of edits for these configurations; after editing, sync them by hand into the target directory from the table above (user level or installation directory).

## Results

Real cases completed in enhanced mode (the former wish mode) — see the [`enhanced-demo`](enhanced-demo) directory for the single-file HTML results and the original prompts:

| Case | Flash Max | Pro Max |
| --- | --- | --- |
| Kerr-Newman black hole WebGL rendering (raymarching + volumetric accretion disk + post-processing) | [View](enhanced-demo/kerr-newman-with-flash-max/kerr_newman.html) | [View](enhanced-demo/kerr-newman-with-pro-max/kerr_newman.html) |
| Minecraft-style 3D game | [View](enhanced-demo/minecraft-with-flash-max/minecraft.html) | [View](enhanced-demo/minecraft-with-pro-max/minecraft.html) |

## Directory structure

```
dsh-minimal-turbo/
├── minimal/                 # minimal-mode configuration (overwrites the official minimal preset)
│   └── agent.cordis.yml
├── enhanced/                # enhanced-mode configuration (its own added preset: reinforced prompt + standard toolchain)
│   ├── agent.cordis.yml
│   └── preset.yml
├── scripts/                 # one-click install scripts (Windows / Linux)
├── enhanced-demo/           # enhanced-mode result showcase
└── README.md
```

## Change log

- 2026-08-25: `wish-lite` regained the `skill-filesystem` and `tool-skill` rows, restoring skill capability in lite wish mode. Cause: the initial trim removed the whole skills block together with other tools, while the deployed composition disables those two host rows by default (the preset mounts them itself — see `packages/bundle/web-app/cordis.patch.yml`), so the tool catalog had no `skill` tool. Synced to the user-level directory `C:\Users\Administrator\.dsh\.agent-presets\wish-lite\agent.cordis.yml`; the original file is backed up as `agent.cordis.yml.bak-20260825-104703`.
- 2026-08-31: `wish-lite` regained the complete toolchain (background jobs, goals, subagents, workflows, web search) to match the standard-mode toolchain. The cause is the same class of problem as the skills issue of 2026-08-25: the initial trim dropped blocks such as `delegation and workflows`, and the Web host composition disables those tool rows by default (`packages/bundle/web-app/cordis.patch.yml`), so lite wish mode had no `subagent`/`subagent_fork` tools. Synced to the user-level directory `C:\Users\Administrator\.dsh\.agent-presets\wish-lite\agent.cordis.yml` (the `preset.yml` description in the same directory was updated too).
- 2026-08-31: the `wish` preset was deleted and `wish-lite` (lite wish mode) was renamed to `enhanced` (enhanced mode). The prompt keeps its original reinforcement and the toolchain stays aligned with standard mode; the mode id and directory are both `enhanced`, the install scripts became `scripts/install-enhanced.ps1` / `scripts/install-enhanced.sh`, and the example directory became `enhanced-demo`. The user-level directory on this machine was synced: `C:\Users\Administrator\.dsh\.agent-presets\wish` was deleted and `wish-lite` was moved to `C:\Users\Administrator\.dsh\.agent-presets\enhanced`.

## License

[MIT](LICENSE)
