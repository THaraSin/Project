## Taste layer

This edition folds in taste-skill's `design-taste-frontend` rules as [reference/taste.md](reference/taste.md). Impeccable runs the process; taste sharpens the aesthetic decisions inside it. Read taste.md after the direction is settled and before building or refining visuals, the same moment craft-floor.md loads, and read only the sections the surface's mode allows. The file runs past 1,200 lines, so use its contents list and read those line ranges.

**When rules disagree**, this order decides: the user's brief, then the project's own design system (DESIGN.md, tokens, existing components), then this file and craft-floor.md, then taste.md.

| Mode | Read in taste.md | Skip |
|---|---|---|
| Persuade, Experience | §0 to §11 and §14. Read §3.A and §3.B through the Stack rule below, and §11 only when redesigning. | §12 block library (not bundled), §13, and the appendices unless the user names one of those design systems |
| Operate, Read | §0.B one-line design read without dials, §3.C to §3.F, §4.1, §4.2, §4.4, §4.5, §4.6, §4.11, §6.B, §9, the §14 items that fit, and §11 when redesigning | Everything else, including §13, which would send app work elsewhere; this skill covers it |

Settled conflicts:

- **Stack.** taste.md assumes React or Next.js, Tailwind v4 and Motion. Use the project's existing stack. For a new standalone HTML page or app, stay with plain HTML, CSS and JavaScript unless the user asks for a framework, and apply taste's rules natively: CSS transitions and scroll-driven animations, IntersectionObserver, and self-hosted fonts via `@font-face` with `font-display: swap`.
- **Motion.** In Operate and Read, craft-floor.md's single authored moment wins; taste's "motion claimed, motion shown" and its scroll skeletons apply to Persuade and Experience only. Every mode honors `prefers-reduced-motion`.
- **Light and dark.** Public, consumer-facing surfaces ship both themes (taste §6.C). Personal and internal tools take their theme from the use scene (craft-floor.md) and add the second only when asked; when both exist, follow `prefers-color-scheme`.
- **Imagery and hero.** taste's real-image mandate and hero rules belong to Persuade and Experience. App screens carry no decorative imagery.
- **Eyebrows.** craft-floor.md bans them outright; that stricter rule wins over taste's eyebrow restraint.
- **Fonts.** Both reject reflex defaults but disagree on replacements. The detector flags Inter, Roboto, Geist, Geist Mono, Fraunces, Montserrat, Open Sans, Instrument Sans, Mona Sans, Plus Jakarta Sans and Space Grotesk, so skip taste's Geist suggestions in §4.1 and its pairings; its Satoshi, Cabinet Grotesk and Outfit picks pass. Taste's own bans on Fraunces and Instrument Serif as defaults still hold. In Operate, a workhorse UI face or a system stack is fine; Persuade and Experience want a face with a point of view.
- **Checks.** Fold the §14 pre-flight items that fit the mode into this skill's single batched inspection round. They add no extra rounds.
- **Design systems.** taste §2's official-package map (Material, Carbon, Fluent and others) applies only when the user wants one of those systems.

### Thai and other stacked scripts

Thai stacks vowels and tone marks above and below the letters, so leading tuned for Latin clips them. When the interface contains Thai:

- Pick a face with Thai and Latin coverage (IBM Plex Sans Thai, Noto Sans Thai, Anuphan, Sarabun). Treat Kanit and Prompt as reflex defaults, the way taste treats Inter.
- Set line heights so ที่ ปั้น กิ๊ก ญี่ปุ่น ผู้ใช้ sit inside the line box. For IBM Plex Sans Thai that measured about 1.55 to 1.6 for headings and 1.7 to 1.75 for body text and labels; measure again for other faces.
- Never give Thai negative letter-spacing or spaced-out label styling. Thai has no letter case.
- Thai has no spaces between words, so check wrapping in narrow columns and truncated labels.
- Thai dates often use the Buddhist Era (2569 = 2026). Follow the product's convention.
