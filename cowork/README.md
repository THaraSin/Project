# impeccable-taste

One skill for Claude Cowork and claude.ai that merges two design skills:

- **impeccable** (pbakaus/impeccable): the design workflow. Commands such as `init`, `shape`, `critique`, `audit` and `polish`, plus the quality floor and an anti-pattern detector.
- **taste** (Leonxlnx/taste-skill, `design-taste-frontend`): anti-slop aesthetic rules. The design read, three dials, typography and color bans, the em-dash ban and a pre-flight check.

Where the two disagree, the skill's "Taste layer" section settles it: stack, motion, light and dark themes, imagery, eyebrows, fonts and checks. It also adds rules for Thai text.

## Install in Cowork

1. In Settings → Capabilities, turn on "Code execution and file creation".
2. Go to Customize → Skills → + → Create skill → Upload a skill, and choose `dist/impeccable-taste.zip`.
3. In Cowork, type `/impeccable-taste init` once per project folder, then use commands such as `/impeccable-taste polish`. You can also ask in plain words.

Skills on your account also show up in chat and in Claude Code.

## Rebuild after an update

```sh
npx impeccable update          # or reinstall; see the main commit for the network workaround
npx skills update              # refreshes taste-skill
node cowork/build.mjs          # writes dist/impeccable-taste.zip
```

Then upload the new ZIP in place of the old one. `cowork/evals/` holds the test prompts and the grader (`node cowork/evals/grade.mjs <iteration-dir>`).

## What differs from the Claude Code install

There's no automatic design hook, so the skill runs its detector itself once per build. Helper agents run as general subagents, or inline when subagents aren't available. The engine downloads from GitHub on first use; if that's blocked, the skill falls back to reading PRODUCT.md and DESIGN.md directly.
