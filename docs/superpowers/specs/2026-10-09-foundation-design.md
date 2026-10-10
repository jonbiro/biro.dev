# Foundation: stylesheet consolidation and QA toolkit

Status: approved design, awaiting spec review
Date: 2026-10-09
Branch: `claude/foundation` (stacked on `claude/visual-polish`)
Program: sub-project 1 of 5 in the Biro.dev site improvement (Foundation → Messaging & structure → Visual redesign → Credibility → Demo upgrade)

## Why

The improvement program optimizes the site for startup-program reviewers first, with a clear path for people seeking help, and includes a bold visual redesign within the existing dark-navy brand. The current stylesheet makes that redesign slow and risky:

- `startup/dist/assets/site.css` is one 44.7 KB file built from 10 appended patch layers.
- 112 selectors are defined more than once (`.hero-visual` 9×, `.header nav` 6×, `.footer-top` 6×).
- 66 distinct hex colors, 59 distinct font-size values, about 20 border-radius values, and 10 media-query conditions, some of them equivalent (`760px` and `47.5rem`).
- `:root` is declared twice at the top level (custom properties, then `font-size:100%`), and a third time inside `@media(prefers-contrast:more)`, where a deliberate high-contrast mode raises `--muted` (`#acbad0` → `#d2def0`) and `--line` (`#293b55` → `#6685af`). `--pale`, `--white` (a dark navy) and `--radius` are defined but never referenced. *(Corrected during implementation: the first version of this spec misread the high-contrast override as a silent redefinition.)*

There is also no repeatable way to prove that a change did or did not alter the rendered site. Every check so far has been ad hoc in-browser JavaScript.

## Goal

A clean, token-based stylesheet source and a committed QA toolkit, with **no change to the rendered site**, proven by machine comparison.

## Non-goals

- No visual changes. Color normalization, type-scale changes, and layout changes belong to the visual redesign (sub-project 3).
- No HTML, copy, or JavaScript changes (`site.js`, `concept-model.js`, `generate.py` page content, `fragments/`, `portfolio.json`).
- No new runtime dependencies. Netlify keeps building with Python only.
- No CI workflow. The toolkit runs locally; CI can be proposed later.
- No changes to `netlify.toml`, redirects, headers, or routes.

## Design

### 1. Stylesheet source layout

New source directory `startup/styles/`, concatenated in a fixed, explicit order:

```text
startup/styles/
  tokens.css          custom properties only
  base.css            reset, html/body, typography defaults, links, focus, skip link, .sr-only
  layout.css          .wrap, .section, grids, page-level layout primitives
  components/
    header.css  footer.css  buttons.css  pills.css  cards.css  faq.css
    notice.css  tables.css  app-icon.css  concept-card.css  demo.css
    (one file per further component the consolidation identifies)
  pages/
    home.css  about.css  products.css  addvancedfocus.css  mission.css
    contact.css  product-page.css  accessibility.css
  media.css           print, prefers-reduced-motion, prefers-contrast
```

The final file list may be split further or merged where a file would be trivially small. The order is defined by a single list in `generate.py`, not by filesystem order.

`generate.py` reads the list, concatenates the files with a one-line generated-file header comment (`/* Generated from startup/styles — do not edit */`), and writes `startup/dist/assets/site.css`. The output stays readable (no minification) so diffs remain reviewable.

`startup/README.md` documents that `styles/` is the source and the generated `dist/assets/site.css` must not be edited by hand.

### 2. Design tokens

`tokens.css` holds a single `:root` declaration. Rules:

- The tokens preserve today's values in every mode. `--muted` and `--line` become the **adaptive** tokens `--text-muted` (`#acbad0`) and `--border-line` (`#293b55`). The high-contrast block keeps raising them (to `#d2def0` and `#6685af`) under their new names.
- Every color value used three or more times (20 values) becomes a token. Values used fewer than three times stay literal for now. The redesign normalizes them.
- Tokens are named by role rather than appearance: `--color-bg`, `--surface-1..n`, `--text`, `--text-muted`, `--text-subtle`, `--accent`, `--accent-strong`, `--border-subtle`, `--border`, `--border-strong`, `--focus-ring`. Radii (`--radius-sm/md/lg/xl/pill`) and repeated spacing values are tokenized under the same three-use rule.
- The existing names `--ink`, `--muted`, `--blue` and `--line` are replaced by their role-named equivalents at every use site. The unused `--pale`, `--white` and `--radius` are removed.
- The `color-scheme: dark` and `font-size: 100%` declarations stay in that single `:root`, as root-level settings, so the stylesheet has exactly one `:root` rule.
- "Repeated spacing values" means whole values of `gap`, `row-gap` and `column-gap`. Eight `rem` values recur three or more times and become `--space-*` tokens. The recurring `10px`, `16px` and `0` stay literal for the redesign to normalize. Padding and margin shorthands stay literal until the redesign, because tokenizing parts of a shorthand adds risk for no visual benefit.

### 3. Cascade consolidation

- Each selector is declared once, in the file that owns it, with the declaration values that win today. Declarations that never win are removed.
- Where two selectors' order relative to each other affects the result (equal specificity, conflicting properties), the winning order is preserved by file order or by keeping them in the same file. The comparison gate (section 4) catches any mistake.
- `!important` stays only where it is today. All 32 uses are inside `prefers-reduced-motion` or `print` blocks, which is appropriate.
- Media queries are grouped per component, next to the rules they modify. `media.css` holds only print, reduced-motion, and contrast preferences.

**Breakpoints.** Equivalent conditions are merged, and pixel conditions become `rem`:

| Today | After |
| --- | --- |
| `max-width: 760px`, `max-width: 47.5rem` | `max-width: 47.5rem` |
| `min-width: 761px` | `min-width: 47.5625rem` |
| `max-width: 1000px` | `max-width: 62.5rem` |
| `max-width: 440px` | `max-width: 27.5rem` |
| `max-width: 60rem`, `max-width: 59.999rem`, `max-width: 24rem` | unchanged |

**Deliberate exception.** At the default 16px browser font size these are identical, so the comparison gate sees no difference. For a visitor who has raised their browser's default font size, `rem` breakpoints switch to the narrow layout sooner. That is the accessible behavior, and it is the only intended change in this sub-project.

`site.js` already uses `rem` media queries (`60rem`, `47.501rem`) and is not changed.

### 4. QA toolkit: `startup/qa/`

A separate package, so the Netlify build (base directory `startup`) never installs it.

- `startup/qa/package.json`: private, ESM, devDependencies pinned to the versions the repository root already declares: `@playwright/test` `^1.62.1` and `@axe-core/playwright` `^4.13.0`. The lockfile is committed.
- The server is started by the toolkit itself: `python3 -m http.server` on `127.0.0.1`, serving `startup/dist`.
- Engines: Chromium and WebKit. WebKit requires a one-time `npx playwright install webkit`.
- Pages: the 15 content routes plus `404.html` (16 documents). `/focusflow/` is excluded because Netlify answers it with a 301 before the file is ever served.
- Widths: 320, 375 and 1280 CSS pixels; the reduced-motion pass also captures 400, 600, 800 and 980 so every breakpoint band between phone and desktop is compared. *(Added after the final review found the 384–1279px range uncaptured.)*

Commands, run from `startup/qa`:

| Command | What it does |
| --- | --- |
| `npm run snapshot -- <out-dir>` | For every page × width, in Chromium, saves a full-page screenshot and a JSON record. The record holds the layout box of every rendered element (every element under `<body>` with at least one client rect, plus `::before`/`::after` computed styles where `content` is not `none`) and a fixed list of computed properties: display, position, box geometry, margin, padding, font family/size/weight, line height, letter spacing, color, background color and image, border widths/styles/colors, border radius, box shadow, opacity, transform, gap, grid template columns, flex direction, text alignment, visibility and z-index. Passes: default motion (after entrance animations finish), reduced motion, print emulation (1280 only), and `prefers-contrast: more` (if the installed Playwright cannot emulate it, the pass is skipped and the pull request says so). A focus pass tabs through each page and records the focused element's outline and box shadow. |
| `npm run compare -- <dir-a> <dir-b>` | Diffs two snapshot sets. It reports each differing element by page, width, pass, selector path, property, and before/after value, and exits non-zero on any difference. Screenshots are pixel-compared, and differing ones are written as highlighted diff images. |
| `npm run audit` | Playwright tests in Chromium and WebKit: no horizontal overflow, exactly one `h1`, no skipped heading levels, `alt` present on every image, unique IDs, in-page anchors resolve, every link has an accessible name (computed through the accessibility tree, so links in collapsed `<details>` are not false positives), calculated text contrast at or above WCAG AA, interactive targets at least 24×24 CSS pixels or covered by the inline/label exception, and axe-core WCAG 2.2 A/AA rules with zero violations. |
| `npm run demo` | Keyboard-only walkthrough of the AddvancedFocus demo, in both engines: arrow keys between horizon tabs, start, pause, done, undo. After each step it asserts the live-region text, which button has focus, the button label, and that settings are locked while running. |
| `npm test` | `audit` and `demo`. |

`startup/README.md` gains a short "Quality checks" section with these commands.

## Acceptance criteria

1. `npm run compare` between a snapshot of `claude/visual-polish` (baseline) and `claude/foundation` reports **zero differences**, in every pass and in both data and screenshots.
2. `npm test` passes in Chromium and WebKit. If axe or WebKit surfaces pre-existing issues on the baseline, they are listed in the pull request and either fixed in a separate commit (when the fix is invisible) or deferred to the redesign. They are never silently suppressed.
3. `python3 generate.py` and `node check-concept.cjs` pass. `git diff` shows `dist/assets/site.css` changing only as the regenerated output of `styles/`.
4. Every selector appears in exactly one rule per media context. One top-level `:root` (plus the high-contrast override in its own media context). No unused custom properties. `!important` appears only in print and reduced-motion blocks.
5. The generated `site.css` is no larger than today's 44.7 KB.
6. `netlify.toml`, HTML output, JavaScript and images are byte-identical to the baseline.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Merging layers changes cascade order and specificity | The computed-style and geometry comparison across 16 pages × 3 widths × 4 passes, plus the focus pass, blocks the merge on any difference |
| States not captured by snapshots (hover, open `<details>`, mobile menu open, demo states) | The focus pass covers focus. The audit and demo tests open the menu and drive the demo. Hover-only styles are listed in the pull request for a manual spot check |
| Someone edits the generated `site.css` by hand | Header comment, README note, and `generate.py` overwrites the file on every build |
| Netlify unexpectedly installs QA dependencies | QA lives in `startup/qa/` with its own `package.json`. The base-directory `startup/package.json` stays dependency-free |

## Handoffs to later sub-projects

- The 46 colors used fewer than three times, the 59 font-size values, and the radius values are normalized into the token scale during the visual redesign. The comparison tool then documents every intended visual change.
- The QA toolkit becomes the regression gate for every later sub-project.
