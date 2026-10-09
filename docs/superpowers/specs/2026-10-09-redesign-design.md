# Visual redesign: design

Status: design approved in conversation (sections 1–4), awaiting spec review
Date: 2026-10-09
Branch: `claude/redesign` (stacked on `claude/messaging`)
Program: sub-project 3 of 5 (Foundation → Messaging & structure → **Visual redesign** → Credibility → Demo upgrade)
Approved mockups: `docs/superpowers/specs/redesign-mockups/`. The mockups load icons from the local preview server at `http://localhost:8080`.

## Why

The site is honest and now well structured, but visually it is a patchwork:

- 52 font sizes, 62 one-off colors, 19 radii and 14 letter-spacing values.
- Text-only sections that look the same as one another.
- Inner-page heroes that leave the right half empty on desktop.

It is built for startup-program reviewers first, with a clear path for people seeking help, so the design must read as confident and credible without becoming clinical.

## Decisions (from the brainstorming session)

| Topic | Decision |
| --- | --- |
| Direction | **Editorial calm combined with the icon constellation**: large editorial type, thin rules and calm spacing, with the nine app icons as the signature image |
| Home hero | Headline on the left. On the right, the constellation: AddvancedFocus at the center, the eight concepts on a slowly drifting orbit. A ruled three-column "Where things stand" strip directly beneath |
| Inner pages | Editorial headline plus a ruled **"at a glance"** column of existing facts. The constellation appears only on Home and Products |
| Type scale | **Dramatic**: ratio about 1.333, display 96px |
| Motion | **Gentle**: slow drift, one-time fade-ups, small hover lifts. All off under reduced motion |
| Approach | **Token system first, then components, then page by page**, each step reviewable with `compare` |
| Fixed | Dark navy, blue accents, system fonts, existing copy, WCAG AA as a floor |

## Non-goals

- No copy changes. The only markup moves are the ones listed under "Pages" (for example, About's facts moving into the hero).
- No new imagery beyond reusing the existing icons, mockups and logo artwork.
- No light theme and no web fonts.
- No changes to the demo's behavior (`site.js` behavior and `concept-model.js`), which is sub-project 5. The demo's visual frame may be restyled.
- No changes to routes, redirects, `netlify.toml` or metadata.

## 1. Tokens (`startup/styles/tokens.css`)

All values are exact. Every other partial uses only these, apart from the one constellation glow gradient.

**Colors**

| Token | Value | Role | Contrast on `--bg` / `--surface-3` |
| --- | --- | --- | --- |
| `--bg` | `#090f1b` | page | — |
| `--surface-1` | `#0d1727` | bands, status strip, footer | — |
| `--surface-2` | `#101d30` | cards, panels | — |
| `--surface-3` | `#142238` | raised elements, pills, inputs | — |
| `--glow` | `#1a3a6e` | constellation light only (gradient) | — |
| `--line-subtle` | `#1e2f47` | dividers | — |
| `--line` | `#304965` | editorial rules, card borders | — |
| `--line-strong` | `#415b7d` | decorative borders only | 2.75 / 2.29 |
| `--line-contrast` | `#6685af` | interactive borders, underline color | 5.05 / 4.21 |
| `--text` | `#e7eef9` | primary text | 16.42 / 13.68 |
| `--text-soft` | `#c1cfe0` | lead copy | 12.11 / 10.09 |
| `--text-muted` | `#acbad0` | secondary text. Raised to `#d2def0` under `prefers-contrast: more` | 9.75 / 8.12 |
| `--accent` | `#8bb6ff` | primary buttons, highlights, focus | 9.34 / 7.78 |
| `--accent-strong` | `#b4cfff` | eyebrows, accent text | 12.15 / 10.12 |
| `--on-accent` | `#091321` | text on accent | 9.08 on `--accent` |
| `--accent-tint` | `#8bb6ff1f` | `Working demo` pill background | — |
| `--accent-tint-line` | `#8bb6ff66` | `Working demo` pill border | — |
| `--shadow` | `#00000055` | soft shadows (mockup frame, icons) | — |

The high-contrast mode keeps raising `--text-muted`, and also sets `--line` to `--line-contrast`.

**Type.** System font stack, unchanged. Steps, as desktop → phone via `clamp()`:

| Token | Size | Line height | Letter spacing | Weight |
| --- | --- | --- | --- | --- |
| `--type-display` | `clamp(3rem, 7.5vw, 6rem)` (48 → 96px) | .98 | -.05em | 600 |
| `--type-h2` | `clamp(2.125rem, 4.2vw, 3.375rem)` (34 → 54px) | 1.05 | -.04em | 600 |
| `--type-h3` | `clamp(1.5rem, 2.3vw, 1.875rem)` (24 → 30px) | 1.2 | -.02em | 600 |
| `--type-lead` | `clamp(1.1875rem, 1.7vw, 1.375rem)` (19 → 22px) | 1.5 | 0 | 400 |
| `--type-body` | `clamp(1rem, 1.1vw, 1.0625rem)` (16 → 17px) | 1.6 | 0 | 400 |
| `--type-ui` | `.9375rem` (15px) | 1.3 | 0 | 600 |
| `--type-small` | `.8125rem` (13px) | 1.5 | 0 | 400 |
| `--type-eyebrow` | `.6875rem` (11px), uppercase | 1.4 | .14em | 700 |

Body copy is capped at about 68 characters per line (`max-width: 68ch`); lead copy at about 34 characters.

**Shape.** `--radius-sm: 8px`, `--radius-md: 14px`, `--radius-lg: 24px`, `--radius-pill: 999px`.

**Space.** A 4px base: `--space-1` through `--space-10` = 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. Section vertical rhythm is `--space-10` (128px) on desktop and 72px at or below 47.5rem. The page gutter is 48px on desktop and 20px on phones, with content up to 1232px wide.

**Motion.** `--motion-fast: 160ms`, `--motion-slow: 600ms`, `--motion-drift: 48s`, `--ease: cubic-bezier(.2, .7, .2, 1)`.

All tokens from Foundation that no rule references any more are removed. `csskit check` enforces this.

## 2. Components

| Component | Design |
| --- | --- |
| **Header** | 26px vertical padding. Brand: `biro` in `--text` plus `.dev` in `--text-muted`. Navigation in `--type-ui`; the active page is underlined in accent (8px offset, 2px thick); Contact is an outline pill (`--line-contrast`). Phones (≤ 47.5rem): a "Menu" outline pill opens a full-width sheet on `--surface-2` with 48px-high rows |
| **Buttons** | Primary: `--accent` with `--on-accent` text, pill-shaped, 14×24px padding. Secondary: a 1px `--line-contrast` outline. Text link: `--type-ui`, underline 6px offset, 2px thick, colored `--line-contrast`, turning `--accent` on hover. Hover lifts by 2px (`--motion-fast`). Focus: a 3px `--accent` outline with a 4px offset |
| **Status pills** | `--type-small`, weight 600, 5×12px padding. `Working demo`: `--accent-tint` background, `--accent-tint-line` border, text `--accent-strong`. `In development`: `--surface-3` background, `--line` border, text `--text`. `Concept`: `--surface-3` background, `--line` border, text `--text-muted` |
| **Ruled columns** (replace boxed cards) | A grid of columns, each with a top rule (`--line`), a number in `--accent` (`--type-small`), a heading in `--type-h3` and body text in `--text-muted`. Used for Home "Why we're here" and "How we build", Mission commitments, About approach, and AddvancedFocus "What we're working toward" |
| **Section header** | Eyebrow, then an `--type-h2` heading, then optional lead text. Up to 2 columns: heading on the left and intro on the right when the intro is long |
| **Status strip** (Home) | Full-bleed `--surface-1` band with top and bottom rules. Three columns (eyebrow, `--type-body` bold title, `--text-muted` line), followed by a "Where things stand →" link to `/products/#where-things-stand` |
| **Where things stand, full** (Products, AddvancedFocus) | The three columns as ruled columns, not boxes, plus the development stages as a numbered ruled row |
| **Concept list** | Ruled rows in 2 columns on desktop and 1 on phones: a 56px icon, the name in `--type-h3`, the category in `--text-muted`, a small `Concept` pill (one per object, as the status system requires), and an arrow. The whole row is the link, and it lifts on hover. On Products each row also keeps the tagline and one-sentence description. It replaces the Products concept cards and Home's icon grid |
| **"At a glance" column** | Left rule (`--line`), eyebrow "AT A GLANCE", then a definition list (`dt` in `--text-muted`, `dd` in `--text`). At or below 47.5rem it moves below the headline, with a top rule instead of a left rule |
| **FAQ** | Ruled `<details>`. The summary is set in `--type-lead` weight 500, with a plus marker in `--accent` that becomes a minus when open. The answer is in `--text-muted` |
| **Footer** | `--surface-1` band. A ruled three-column grid: brand and tagline, navigation, founder (location, email, GitHub). The bottom row holds ©, the "Privacy in this demo" and "Accessibility" links, and the status line in `--type-small` |
| **Mockup frame** | Product mockups sit in a `--radius-lg` frame with a `--line` border and a soft shadow. Captions stay as `<figcaption>` |

## 3. Pages

| Page | Changes |
| --- | --- |
| **Home** | Hero: display headline, rule, lead, actions and the founded line on the left; the **constellation** on the right. The status strip sits directly below. The old concept card and ribbon artwork are removed from the hero. "Why we're here" and "How we build" become ruled columns. The Beyond-the-flagship section becomes the concept list. The founder close stays a closing panel with GitHub. The other sections keep their current order |
| **Products** | Hero: headline and intro plus the on-page menu, with a **compact constellation** on the right. The flagship block keeps its pills and gets the mockup frame. Then Where things stand (full, ruled), the needs guide (restyled table: ruled rows, quote in `--type-lead`), the concept list, Connected by choice with the logo family, and the FAQ |
| **AddvancedFocus** | Hero: headline plus today's "Support that stays with you" column restyled as the ruled column. The demo section follows immediately. Its frame is restyled with tokens, and its behavior is unchanged. Then the mockup frame and the existing sections as ruled columns, Where things stand, and the FAQ |
| **About** | Hero "at a glance": Company, Founder (Jonathan Biro · GitHub), Based in, First product, Stage. **The separate "Company at a glance" section is removed**, since its facts moved into the hero. The founder panel and prose remain, plus the approach and evaluation sections as ruled columns |
| **Mission** | Hero "at a glance": Design target (WCAG 2.2 Level AA), Commitments (Privacy · Affordability · User autonomy · Inclusive design), and This website (the existing sentence "This website has no sign-up, live AI request, analytics script, or marketing cookie."). The commitments become ruled columns |
| **Contact** | Hero "at a glance": Email, Founder (· GitHub), Based in, and the existing note "Opens your email app. You can review your message before sending." The topics become ruled columns |
| **Accessibility** | Hero "at a glance": Target (WCAG 2.2 Level AA), Last reviewed (the existing date), Tested in (Chromium and WebKit), Not yet verified (Screen readers, independent audit). The existing sections are restyled |
| **Product pages (8)** | The overview aside becomes the ruled column (same content: Concept pill, icon, tagline, Who it's for, The goal). Workflow steps and capabilities become ruled columns. The mockup gets the frame. Related products use the concept-list rows |
| **404** | Display headline and actions; no column |

"At a glance" content uses only facts already present on the site. Moving a fact into the hero never adds a new one.

## 4. The constellation

- **Markup:** a `<div class="constellation" aria-hidden="true">` with the AddvancedFocus icon at the center and the eight concept icons on an orbit. Every image has `alt=""`, and none is a link. The facts it implies already appear in the text and the status strip.
- **Sizes:** Home, up to 520px square on desktop and 280px on phones, after the actions. Products, compact: up to 360px on desktop; hidden at or below 27.5rem, where the menu follows the intro directly.
- **Layout:** two dashed rings (`--line`) at 4% and 22% inset. A radial `--glow` behind the center. The center icon is 24% of the width with an accent halo. Orbit icons are 12% wide, evenly spaced.
- **Drift:** the orbit group rotates once per `--motion-drift` (48s, linear), and each icon counter-rotates so it stays upright. `site.js` pauses the animation (adds `is-paused`) when the element is off-screen or the tab is hidden, using IntersectionObserver and `visibilitychange`. It does not move under `prefers-reduced-motion: reduce`.
- **Built by** `site_parts.constellation(size)` in Python, so Home and Products share one implementation.

## 5. Motion

- **Section fade-ups:** sections rise 12px and fade in once, over `--motion-slow`, when they enter the viewport. `site.js` adds `js-reveal` to `<html>` and `is-visible` to each section, and only sections inside `<main>` are affected. Without JavaScript, or under reduced motion, everything renders visible immediately, so content never depends on the script.
- **Hover:** buttons, concept rows and ruled-column links translate -2px over `--motion-fast`.
- The existing hero entrance animation is replaced by the fade-up.
- Under `prefers-reduced-motion: reduce`: no drift, no fade-ups, no hover movement (color changes stay).

The demo's existing behavior and its announcements are untouched. `site.js` changes are limited to the reveal and constellation-pause code. Both are additive and contained in clearly marked functions, and the demo keyboard tests must pass unchanged.

## 6. Responsive

- **Breakpoints:** wide (> 60rem), medium (47.5–60rem), narrow (≤ 47.5rem), very narrow (≤ 27.5rem).
- **Hero grids:** two columns become one at narrow width. The constellation and the at-a-glance column move below the headline.
- **Typography:** display and heading sizes scale with `clamp()`. No forced `<br>` line breaks at narrow width; headings wrap naturally.
- **Tap targets:** at least 44px high for the menu, buttons, pills used as links, concept rows and FAQ summaries.
- **Overflow:** no horizontal scrolling at 320px. The existing audit checks every page.

## 7. Accessibility

- All text colors reach ≥ 7.7:1 on their surfaces. Interactive borders use `--line-contrast`, which reaches ≥ 4.2:1 against every surface.
- **Focus:** a visible 3px `--accent` outline with a 4px offset on every interactive element. Checked by the focus pass in `snapshot` and by axe.
- The heading outline is unchanged, apart from the About section removal: no skipped levels, and exactly one `h1`.
- Decorative art is hidden from assistive technology (`aria-hidden` or `alt=""`).
- `npm test` must stay at 198/198, or more if the route or test count grows, with **no new `known-issues.json` entries**. Problems the redesign introduces are fixed, not deferred.

## 8. Deferred items to clear during the redesign

From the Foundation and Messaging final reviews:

- Delete the dead `.example` rules, the `.portfolio-card details`, `.portfolio-card summary` and `.portfolio-card details>div` rules, and any rules the redesign makes dead.
- Make "How we're building it" a real heading (`h3`, with stage titles as `h4`).
- Rename the numbered `--border-*` and `--surface-*` tokens to the role names in section 1.
- Extend the cross-page anchor test to same-page `#` links.
- Assert the accessibility statement's date with a date pattern, not a fixed date.
- Replace `assert` with `ValueError` in the `generate.py` principles splice.
- Ignore `"profiles": null` gracefully.
- Add an agreement test between `STYLE_SOURCES` and csskit's `STYLE_ORDER`.

## Acceptance criteria

1. `tokens.css` defines exactly the tokens in section 1, apart from Foundation's high-contrast override block. `csskit check` passes, and no hex color appears in any partial other than `tokens.css`.
2. The number of distinct `font-size` values in the generated CSS is ≤ 12: the 8 type tokens plus up to 4 documented exceptions inside the demo frame.
3. Every page matches section 3 at 375px and 1280px. The PR includes `compare` reports between steps and screenshots of each page at both widths.
4. `npm test` passes with zero new known issues. `python3 -m unittest discover -s tests` and `-s tools` pass. `node check-concept.cjs` passes, and the keyboard demo tests pass unchanged.
5. Under `prefers-reduced-motion: reduce` there is no animation or transform transition anywhere, verified by a snapshot pass: computed `animation-name` is `none` and transition durations are 0 for all elements.
6. With JavaScript disabled, every section is visible, verified by a Playwright test with `javaScriptEnabled: false`.
7. The section 8 items are done, each with its test where one applies.
8. No copy changes: the sentence-level copy diff against `claude/messaging` shows only the About "Company at a glance" facts moving into the hero.
