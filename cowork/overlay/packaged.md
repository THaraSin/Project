## Packaged edition

This copy runs as the `impeccable-taste` skill in Cowork or claude.ai, outside Claude Code's project folders. Four things differ from a Claude Code install:

- **Command names.** This file, its references and the engine's output write commands as `/impeccable <command>`. Here the user types `/impeccable-taste <command>` or asks in plain words, so suggest commands in that form.
- **Launcher.** Setup's base-directory rule already maps every `.claude/skills/impeccable/scripts/impeccable` path to this skill's folder. If the launcher is not executable after upload, call it as `sh <skill-base-dir>/scripts/impeccable <verb>`. It fetches its engine from GitHub on first use; if that download or the launcher fails, follow **Launcher unavailable** above.
- **Helper agents.** Where a reference says to spawn `impeccable-finish-reviewer`, `impeccable-asset-producer`, `impeccable-documenter` or `impeccable-manual-edit-applier`, spawn a general-purpose subagent with the matching file in [agents/](agents/) as its instructions, plus the inputs the reference lists. Without subagents, run the role inline from `reference/degraded/<role>.md`, as the references already describe.
- **No design hook.** Nothing runs the detector after each edit, so take the references' no-hook path: run `<skill-base-dir>/scripts/impeccable detect --json` on the changed web files once, during the inspection round. `pin` and `hooks` manage Claude Code project files and do nothing here; say so if the user asks for them.
