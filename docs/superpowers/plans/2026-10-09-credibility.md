# Credibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add About's "How the work is checked" section and a link to it from Home. Every claim in the section points to evidence already on the site.

**Architecture:**
- **About section:** `generate.py` builds the section from the existing `section_intro()` and `cards()` helpers. It is spliced into the About page directly before the fragment's `<section class="feature-section">`, which places it after the founder layout.
- **Home link:** Home's `HOW_WE_BUILD` block gains one text link.
- **No CSS:** existing classes only.

**Tech Stack:** Python 3 standard library generator; `unittest` page tests via `tests/pagecheck.py`; the Playwright suite in `startup/qa`.

**Spec:** `docs/superpowers/specs/2026-10-09-credibility-design.md`

## Global Constraints

- **Copy:** exactly as written in the spec's "Copy (exact)" list. No digits in the section, and no claims about how often tests run ("every change", "continuous").
- **No new facts:** nothing about customers, funding, partnerships, release dates, clinical results, AI providers, employers, or numbers. No repository link.
- **CSS:** no new rules. `python3 tools/csskit.py check dist/assets/site.css --html dist` must stay OK.
- **Branch and PR:** branch `claude/credibility`; open the PR against `main` and never merge without the user's instruction. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Gates:**
  - Python: `cd startup && python3 generate.py >/dev/null && python3 -m unittest discover -s tests -p 'test_*.py' && python3 -m unittest discover -s tools -p 'test_*.py' && python3 tools/csskit.py check dist/assets/site.css --html dist`
  - Browser: `npm --prefix startup/qa test`

## Review Focus

1. **Readers scanning headings.** The new h2 and h3s must keep heading levels in order on About. Pinned by the existing audit's heading-structure check, which runs in Task 1, Step 4.
2. **Four cards at 760–1000px.** The four-card two-column rule must not cause overflow. Pinned by the motion-on overflow test at 800 and 1024 in the browser suite.
3. **Link targets.** Each link must land on a real anchor, including `#how-the-work-is-checked` from Home. Pinned by `test_every_fragment_link_resolves`.
4. **Status-phrase placement.** The section must not repeat tracked phrases ("not a released", "pre-release", …) outside the allowed places. Pinned by the existing `test_status_phrases_appear_only_in_allowed_places`.
5. **Copy that goes stale.** No digits in the section. Pinned by the new test in Task 1.

---

### Task 1: The section, the Home link and their tests

**Files:**
- Modify: `startup/generate.py` (a new `HOW_CHECKED` constant before `ABOUT_HERO`; the About assembly line; the `HOW_WE_BUILD` closing link)
- Test: `startup/tests/test_pages.py`

**Interfaces:**
- Produces: the anchor `/about/#how-the-work-is-checked`.

- [ ] **Step 1: Write the failing tests**

Append to class `Sitewide` in `startup/tests/test_pages.py`:

```python
    def test_about_shows_how_the_work_is_checked(self):
        sections = main_sections(load('/about/'))
        ids = [s.attrs.get('id') for s in sections]
        self.assertIn('how-the-work-is-checked', ids)
        index = ids.index('how-the-work-is-checked')
        self.assertIn('founder-layout', sections[index - 1].classes)
        section = sections[index]
        self.assertEqual(section.attrs.get('aria-labelledby'), 'how-checked-title')
        self.assertEqual(section.find(tag='h2').attrs.get('id'), 'how-checked-title')
        cards = section.find_all(cls='card')
        self.assertEqual([c.find(tag='h3').text() for c in cards],
                         ['A demo you can operate', 'Tested in more than one browser', 'Nothing collected', 'Status without spin'])
        self.assertEqual([[a.attrs['href'] for a in c.find_all(tag='a')] for c in cards],
                         [['/addvancedfocus/#concept-demo'], ['/accessibility/'], ['/mission/#privacy'], ['/products/#where-things-stand']])
        text = section.text()
        self.assertNotRegex(text, r'\d', 'no counts or versions that go stale')
        for banned in ('every change', 'continuous', 'github'):
            self.assertNotIn(banned, text.lower())

    def test_home_how_we_build_links_to_the_checks(self):
        section = load('/').find(id='how-we-build')
        self.assertIn('/about/#how-the-work-is-checked', [a.attrs.get('href') for a in section.find_all(tag='a')])
```

`main_sections` is imported inside `Home.setUp` today. Add it to the top-level import, so it reads `from pagecheck import DIST, ROOT, ROUTES, load, main_sections, page_path, parse`.

The redesign's `.cards+.text-link` spacing rule stays in use after this change, because About's later card grid is still followed by a bare text link, so csskit's dead-selector check is unaffected.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd startup && python3 generate.py >/dev/null && python3 -m unittest discover -s tests -p 'test_pages.py'`

Expected:
- `test_about_shows_how_the_work_is_checked` fails with `'how-the-work-is-checked' not found`.
- `test_home_how_we_build_links_to_the_checks` fails because the href is missing.

- [ ] **Step 3: Implement**

In `startup/generate.py`, insert directly before the `ABOUT_HERO = inner_hero(` line:

```python
HOW_CHECKED = ('<section class="section wrap" id="how-the-work-is-checked" tabindex="-1" aria-labelledby="how-checked-title">'
    + section_intro('HOW THE WORK IS CHECKED', 'Checked before <br>it’s claimed.',
                    'Jonathan’s background is in QA automation, so this website is held to the same standard. Each claim below points to something you can check yourself.').replace('<h2>', '<h2 id="how-checked-title">', 1)
    + cards([('A demo you can operate', 'The AddvancedFocus concept is interactive: three everyday situations, two energy levels, a session you can pause with a note, and a completion you can undo. It runs in your browser on scripted examples, not live AI. <a class="text-link" href="/addvancedfocus/#concept-demo">Try the working demo</a>'),
             ('Tested in more than one browser', 'Every page is checked with automated tests in Chromium and WebKit, at phone and desktop widths, against WCAG 2.2 Level AA rules, with reduced motion on and with JavaScript off. The demo is also tested keyboard-only. What hasn’t been tested yet is listed too. <a class="text-link" href="/accessibility/">Read the accessibility statement</a>'),
             ('Nothing collected', 'There is no sign-up, live AI request, analytics script, or marketing cookie. Notes you write in the demo stay in the page’s memory. <a class="text-link" href="/mission/#privacy">See what stays in your browser</a>'),
             ('Status without spin', 'What works today, what’s being built, and what isn’t decided yet are listed in one place. <a class="text-link" href="/products/#where-things-stand">See where things stand</a>')])
    + '</section>')
```

The `.replace('<h2>', …)` targets only the section intro's h2. The cards contain h3s only.

In the `about = ABOUT_HERO + (ROOT / 'fragments/about.html').read_text().replace('{{PROFILE_LINKS}}', …)` line, chain one more replace onto the fragment read, directly after `.read_text()`:

```python
.replace('<section class="feature-section">', HOW_CHECKED + '<section class="feature-section">', 1)
```

Use this script, which asserts the anchors:

```bash
cd startup && python3 - <<'PYEOF'
from pathlib import Path
p = Path('generate.py'); t = p.read_text()
old = "about = ABOUT_HERO + (ROOT / 'fragments/about.html').read_text().replace('{{PROFILE_LINKS}}'"
assert t.count(old) == 1
t = t.replace(old, "about = ABOUT_HERO + (ROOT / 'fragments/about.html').read_text().replace('<section class=\"feature-section\">', HOW_CHECKED + '<section class=\"feature-section\">', 1).replace('{{PROFILE_LINKS}}'")
old = "    + '<a class=\"text-link\" href=\"/mission/\">Read our design commitments</a></section>')"
assert t.count(old) == 1
t = t.replace(old, "    + '<div class=\"actions\"><a class=\"text-link\" href=\"/mission/\">Read our design commitments</a><a class=\"text-link\" href=\"/about/#how-the-work-is-checked\">See how the work is checked</a></div></section>')")
p.write_text(t); print('ok')
PYEOF
```

The Home links sit in the existing `.actions` row (flex, wrapping, with a gap), so the two links read as a pair. The fragment has exactly one `<section class="feature-section">`; confirm with `grep -c 'class="feature-section"' startup/fragments/about.html`, which should print `1`.

- [ ] **Step 4: Run all gates**

Run the Python gate, then the browser gate.

Expected:
- Python: all `OK`, and csskit reports OK.
- Browser: 214 passed, no new known issues. This includes the heading-structure audit, the axe checks and the overflow test (Review Focus 1, 2 and 4).

- [ ] **Step 5: Commit**

```bash
git add startup/generate.py startup/tests/test_pages.py startup/dist
git commit -m "Add About's 'How the work is checked' section and link it from Home

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Look, copy check and PR

**Files:** none modified, unless the visual check finds a defect.

- [ ] **Step 1: Look at the result**

Capture `/about/#how-the-work-is-checked` and Home's `#how-we-build` at 375px and 1280px, using Playwright element screenshots against a local `python3 -m http.server 8080 --directory startup/dist`.

Confirm:
- the four ruled cards sit in two columns at 1280px and one column at 375px;
- each card's link sits on its own line after the body;
- the Home links read as a pair.

Fix any layout defect with existing classes only.

- [ ] **Step 2: Copy check against `main`**

Extract `git archive main startup/dist` into the scratchpad. Then list every text segment on the new build that is absent from `main`.

Expected: only the strings listed in the spec's "Copy (exact)" section and the Home link label. Compare each one against the spec character by character, curly apostrophes included.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin claude/credibility
gh pr create --base main --head claude/credibility --title "Credibility: How the work is checked" --body-file <scratchpad>/credibility-pr.md
```

The body must:
- summarize the section and its four evidence links;
- include the gate results from Task 1, Step 4;
- state that no new facts and no repository link were added;
- end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Do not merge.
