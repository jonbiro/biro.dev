# Messaging & Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure Home, Products, AddvancedFocus and the eight product pages around one status system and a reviewer-first story, using only existing copy plus verified demo behaviour, and add founder profile links.

**Architecture:** A new stdlib module, `startup/site_parts.py`, owns the shared parts: status pills, the single "Where things stand" block, and profile links read from `site-config.json`. `generate.py` composes Home, Products and AddvancedFocus as explicit ordered lists of sections, replacing today's chains of `.replace()` patches. Page tests in `startup/tests/` parse the generated HTML with the standard-library `html.parser` and pin every structural and copy rule from the spec. The Foundation QA toolkit gates accessibility and documents the visual changes.

**Tech Stack:** Python 3.9+ standard library (`unittest`, `html.parser`, `subprocess`); the existing `startup/qa` Playwright toolkit.

**Spec:** `docs/superpowers/specs/2026-10-09-messaging-design.md`

## Global Constraints

- **Branch:** `claude/messaging`, stacked on `claude/foundation`. Open the pull request against `claude/foundation`, and never merge it without the user's explicit instruction.
- **Copy:** no new claims. Every new or changed sentence is a verbatim or condensed sentence from the current site, or describes demo behaviour verified by `startup/check-concept.cjs` (stop without false completion, undo, return notes up to 240 characters, two- or five-minute sessions, three situations, two energy levels). Never use "will" for an undecided capability.
- **Status labels:** exactly `Working demo`, `In development`, `Concept`, shown with the existing `pill` class.
- **Tracked status phrases** (case-insensitive): `not a released`, `not yet publicly available`, `release timing`, `have not been announced`, `pre-release`. They may appear only inside `<figcaption>`, `<footer>`, `#where-things-stand`, `#privacy` (Mission), the Home hero `.micro` line, or anywhere on `/accessibility/`.
- **Profile links:** `site-config.json` → `"profiles": {"github": "https://github.com/jonbiro", "linkedin": ""}`. A link renders only for a trimmed `https://` URL with no spaces, quotes or angle brackets. Each link uses visible text naming the service, `rel="me"`, and opens in the same tab.
- **Build:** Netlify still runs only `python3 generate.py`, and `site_parts.py` uses only the standard library. `generate.py` may read `BIRO_SITE_CONFIG` and `BIRO_SITE_OUT` from the environment for tests. Without them, behaviour is unchanged.
- **No changes to** routes, redirects, `netlify.toml`, `site.js`, `concept-model.js`, or images.
- **New CSS** goes only into the matching `startup/styles/` partial, as minimal rules. `python3 tools/csskit.py check dist/assets/site.css --html dist` must stay `OK`.
- **Test commands:**
  - pages: `cd startup && python3 generate.py >/dev/null && python3 -m unittest discover -s tests -p 'test_*.py'`
  - csskit: `cd startup && python3 -m unittest discover -s tools -p 'test_*.py'`
  - accessibility: `npm --prefix startup/qa test` (198 tests, Chromium and WebKit)
  - demo model: `cd startup && node check-concept.cjs`
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Malformed profile URLs (`http://…`, `javascript:…`, surrounding whitespace, embedded quotes) must never render a link; a reasonable person expects a bad config value to be ignored, not published. Pinned in Task 1, Step 1.
2. Links from other pages to sections that this plan renames or removes (`/products/#development`, the old readiness section) must not dangle. Pinned by the cross-page anchor test in Task 6, Step 1.
3. `fragments/portfolio-principles.html` is shared by Products and Mission. Editing it for Products must leave Mission's section intact. Pinned by the Mission test in Task 6, Step 1.
4. Adding a LinkedIn URL later must make it appear in all three places (footer, About, Contact) with no other change. Pinned by the end-to-end regeneration test in Task 2, Step 1.
5. New markup (pills beside headings, links inside cards, icon-only image links) must not introduce accessibility violations. Pinned by running the axe suite at the end of every task (Tasks 2–6).

---

### Task 1: Shared page parts

**Files:**
- Create: `startup/site_parts.py`
- Test: `startup/tests/test_site_parts.py`

**Interfaces:**
- Produces: `STATUS_LABELS: dict[str, str]`; `status_pill(kind: str) -> str` (`kind` ∈ `demo`, `development`, `concept`); `profile_links(config: dict) -> list[tuple[str, str]]` (label, url); `render_profile_links(links, css_class: str, separator: str = ' ') -> str`; `where_things_stand(variant: str) -> str` (`variant` ∈ `compact`, `full`). The block's section has `id="where-things-stand"`.

- [ ] **Step 1: Write the failing tests**

`startup/tests/test_site_parts.py`:

```python
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import site_parts as sp  # noqa: E402


class StatusPill(unittest.TestCase):
    def test_the_three_labels(self):
        self.assertEqual(sp.status_pill('demo'), '<span class="pill">Working demo</span>')
        self.assertEqual(sp.status_pill('development'), '<span class="pill">In development</span>')
        self.assertEqual(sp.status_pill('concept'), '<span class="pill">Concept</span>')

    def test_unknown_kind_is_an_error(self):
        with self.assertRaises(KeyError):
            sp.status_pill('launched')


class ProfileLinks(unittest.TestCase):
    def test_only_valid_https_urls_render_in_a_fixed_order(self):
        config = {'profiles': {'linkedin': ' https://www.linkedin.com/in/example ', 'github': 'https://github.com/jonbiro'}}
        self.assertEqual(sp.profile_links(config), [('GitHub', 'https://github.com/jonbiro'),
                                                    ('LinkedIn', 'https://www.linkedin.com/in/example')])

    def test_empty_missing_or_unsafe_values_are_ignored(self):
        for value in ('', 'http://github.com/jonbiro', 'javascript:alert(1)', 'https://x.test/"onmouseover', 'https://a b'):
            self.assertEqual(sp.profile_links({'profiles': {'github': value}}), [], value)
        self.assertEqual(sp.profile_links({}), [])

    def test_rendered_links_name_the_service_and_use_rel_me(self):
        html = sp.render_profile_links([('GitHub', 'https://github.com/jonbiro?a=1&b=2')], 'text-link')
        self.assertEqual(html, '<a class="text-link" href="https://github.com/jonbiro?a=1&amp;b=2" rel="me">GitHub</a>')


class WhereThingsStand(unittest.TestCase):
    def test_compact_has_three_columns_and_links_to_the_full_version(self):
        html = sp.where_things_stand('compact')
        self.assertIn('id="where-things-stand"', html)
        self.assertEqual(html.count('<article>'), 3)
        for text in ('Working demo', 'In development', 'Not yet decided', 'Public launch date', 'Pricing',
                     'Supported platforms', 'AI provider', 'Data practices', 'href="/addvancedfocus/#concept-demo"',
                     'href="/products/#where-things-stand"'):
            self.assertIn(text, html)
        self.assertNotIn('development-steps', html)

    def test_full_adds_the_three_development_stages_and_no_self_link(self):
        html = sp.where_things_stand('full')
        self.assertIn('<ol class="development-steps">', html)
        self.assertEqual(html.count('<li><span class="pill">'), 3)
        self.assertNotIn('href="/products/#where-things-stand"', html)

    def test_unknown_variant_is_an_error(self):
        with self.assertRaises(ValueError):
            sp.where_things_stand('tiny')


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd startup && python3 -m unittest discover -s tests -p 'test_*.py'`
Expected: FAIL with `ModuleNotFoundError: No module named 'site_parts'`.

- [ ] **Step 3: Write the implementation**

`startup/site_parts.py`:

```python
"""Shared page parts for generate.py: status labels, the "Where things stand" block, and founder profile links."""
from html import escape

STATUS_LABELS = {'demo': 'Working demo', 'development': 'In development', 'concept': 'Concept'}
PROFILE_SERVICES = (('github', 'GitHub'), ('linkedin', 'LinkedIn'))
UNSAFE_URL_CHARACTERS = set(' "\'<>')


def status_pill(kind: str) -> str:
    return f'<span class="pill">{STATUS_LABELS[kind]}</span>'


def profile_links(config: dict) -> list:
    """(label, url) for each configured profile whose URL is a plain https:// address, in a fixed order."""
    profiles = config.get('profiles', {})
    links = []
    for key, label in PROFILE_SERVICES:
        url = str(profiles.get(key, '')).strip()
        if url.startswith('https://') and not UNSAFE_URL_CHARACTERS.intersection(url):
            links.append((label, url))
    return links


def render_profile_links(links: list, css_class: str, separator: str = ' ') -> str:
    return separator.join(f'<a class="{css_class}" href="{escape(url, quote=True)}" rel="me">{escape(label)}</a>'
                          for label, url in links)


def where_things_stand(variant: str) -> str:
    """The one "Where things stand" block: 'compact' for Home and AddvancedFocus, 'full' for Products."""
    if variant not in ('compact', 'full'):
        raise ValueError(f'Unknown variant: {variant}')
    columns = (
        '<div class="readiness-grid">'
        f'<article>{status_pill("demo")}<h3>Built and working</h3><ul>'
        '<li>An interactive AddvancedFocus concept with three everyday situations and two energy levels</li>'
        '<li>Two- and five-minute sessions you can pause with a return note, stop without marking the step complete, or undo</li>'
        '<li>This website and its accessibility statement</li></ul>'
        '<a class="text-link" href="/addvancedfocus/#concept-demo">Try the working demo</a></article>'
        f'<article>{status_pill("development")}<h3>What we’re building</h3><ul>'
        '<li>AI-assisted task initiation and planning</li><li>Flexible routines and household coordination</li>'
        '<li>Privacy, affordability, and user control</li></ul></article>'
        '<article><h3>Not yet decided</h3><ul><li>Public launch date</li><li>Pricing</li><li>Supported platforms</li>'
        '<li>AI provider</li><li>Data practices</li></ul><p class="micro">We’ll explain these before public release.</p></article>'
        '</div>'
    )
    if variant == 'full':
        after = (
            '<p class="eyebrow where-stages">HOW WE’RE BUILDING IT</p><ol class="development-steps">'
            '<li><span class="pill">Current concept</span><h3>Make the interaction tangible</h3><p>Explore smaller starting points, flexible focus sessions, and a way back after interruptions through the interactive website prototype.</p></li>'
            '<li><span class="pill">Planned development</span><h3>Add useful intelligence</h3><p>Develop AI-assisted ways to turn everyday intentions into manageable actions, while keeping suggestions understandable and editable.</p></li>'
            '<li><span class="pill">Before public release</span><h3>Clarify the full experience</h3><p>Evaluate accessibility and reliability, define personal-data controls, and communicate supported platforms, pricing, and product limitations.</p></li>'
            '</ol><p class="micro">This is a statement of direction. Scope and sequencing may change as development progresses.</p>'
        )
    else:
        after = '<a class="text-link where-more" href="/products/#where-things-stand">See how we’re building it</a>'
    return ('<section class="section wrap readiness" id="where-things-stand" tabindex="-1" aria-labelledby="where-things-stand-title">'
            '<p class="eyebrow">WHERE THINGS STAND</p><h2 id="where-things-stand-title">AddvancedFocus: what’s here today.</h2>'
            + columns + after + '</section>')
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd startup && python3 -m unittest discover -s tests -p 'test_*.py'`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add startup/site_parts.py startup/tests/test_site_parts.py
git commit -m "Add shared status, where-things-stand and profile-link page parts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Page test harness, profile links and the footer status line

**Files:**
- Create: `startup/tests/pagecheck.py`, `startup/tests/test_pages.py`
- Modify: `startup/site-config.json`, `startup/generate.py`, `startup/fragments/about.html`, `startup/fragments/contact.html`, `startup/styles/components/footer.css`

**Interfaces:**
- Consumes: `profile_links`, `render_profile_links` (Task 1).
- Produces: `pagecheck.ROOT`, `pagecheck.DIST`, `pagecheck.ROUTES`, `pagecheck.parse(path) -> Node`, `pagecheck.load(route) -> Node`, `pagecheck.main_sections(root) -> list[Node]`, and `Node` with `.tag`, `.attrs`, `.classes`, `.text()`, `.find(...)`, `.find_all(tag=, cls=, id=)`, `.ancestors()`, `.strings()` (yields `(text, parent_node)`). Also `generate.PROFILE_LINKS`, and the environment overrides `BIRO_SITE_CONFIG` and `BIRO_SITE_OUT`.

- [ ] **Step 1: Write the harness and the failing tests**

`startup/tests/pagecheck.py`:

```python
"""A minimal HTML tree for page tests, built with the standard library."""
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}


class Node:
    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []

    @property
    def classes(self):
        return (self.attrs.get('class') or '').split()

    def text(self):
        return ' '.join(''.join(c if isinstance(c, str) else ' ' + c.text() + ' ' for c in self.children).split())

    def iter(self):
        for child in self.children:
            if isinstance(child, Node):
                yield child
                yield from child.iter()

    def strings(self):
        for child in self.children:
            if isinstance(child, str):
                yield child, self
            else:
                yield from child.strings()

    def find_all(self, tag=None, cls=None, id=None):
        return [n for n in self.iter() if (tag is None or n.tag == tag) and (cls is None or cls in n.classes)
                and (id is None or n.attrs.get('id') == id)]

    def find(self, **kwargs):
        found = self.find_all(**kwargs)
        return found[0] if found else None

    def ancestors(self):
        node = self
        while node is not None:
            yield node
            node = node.parent


class _Builder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = self.current = Node('#root', {}, None)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.current)
        self.current.children.append(node)
        if tag not in VOID:
            self.current = node

    def handle_startendtag(self, tag, attrs):
        self.current.children.append(Node(tag, attrs, self.current))

    def handle_endtag(self, tag):
        node = self.current
        while node is not self.root and node.tag != tag:
            node = node.parent
        if node is not self.root:
            self.current = node.parent

    def handle_data(self, data):
        self.current.children.append(data)


def parse(path) -> Node:
    builder = _Builder()
    builder.feed(Path(path).read_text())
    return builder.root


def page_path(route: str, dist=DIST) -> Path:
    if route == '/':
        return dist / 'index.html'
    if route.endswith('.html'):
        return dist / route.lstrip('/')
    return dist / route.strip('/') / 'index.html'


def load(route: str) -> Node:
    return parse(page_path(route))


def main_sections(root: Node) -> list:
    main = root.find(tag='main')
    return [c for c in main.children if isinstance(c, Node)]


ROUTES = ['/'] + sorted(f'/{p.parent.name}/' for p in DIST.glob('*/index.html')
                        if p.parent.name not in ('assets', 'focusflow')) + ['/404.html']
```

`startup/tests/test_pages.py`:

```python
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from pagecheck import DIST, ROOT, ROUTES, load, page_path, parse

GITHUB = 'https://github.com/jonbiro'
STATUS_LINE = 'Biro.dev is pre-release. Concepts and artwork are illustrative, not released apps.'


def profile_hrefs(node):
    return [a.attrs.get('href') for a in node.find_all(tag='a') if a.attrs.get('rel') == 'me']


class FooterAndProfiles(unittest.TestCase):
    def test_every_footer_has_the_status_line_and_the_github_profile(self):
        for route in ROUTES:
            footer = load(route).find(tag='footer')
            self.assertIn(STATUS_LINE, footer.text(), route)
            self.assertEqual(profile_hrefs(footer), [GITHUB], route)
            self.assertNotIn('Products in development', footer.text(), route)

    def test_about_and_contact_link_the_founder_profile(self):
        for route, container in (('/about/', 'founder-panel'), ('/contact/', 'contact-card')):
            self.assertEqual(profile_hrefs(load(route).find(cls=container)), [GITHUB], route)

    def test_no_linkedin_link_while_it_is_not_configured(self):
        for route in ROUTES:
            self.assertNotIn('linkedin', page_path(route).read_text().lower(), route)

    def test_a_configured_linkedin_appears_in_all_three_places(self):
        with tempfile.TemporaryDirectory() as tmp:
            config = json.loads((ROOT / 'site-config.json').read_text())
            config['profiles']['linkedin'] = 'https://www.linkedin.com/in/example'
            config_path = Path(tmp) / 'site-config.json'
            config_path.write_text(json.dumps(config))
            out = Path(tmp) / 'out'
            env = {**os.environ, 'BIRO_SITE_CONFIG': str(config_path), 'BIRO_SITE_OUT': str(out)}
            subprocess.run([sys.executable, str(ROOT / 'generate.py')], env=env, check=True, capture_output=True)
            for route, container in (('/', None), ('/about/', 'founder-panel'), ('/contact/', 'contact-card')):
                root = parse(page_path(route, out))
                node = root.find(tag='footer') if container is None else root.find(cls=container)
                self.assertEqual(profile_hrefs(node), [GITHUB, 'https://www.linkedin.com/in/example'], route)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd startup && python3 generate.py >/dev/null && python3 -m unittest discover -s tests -p 'test_*.py'`
Expected: the four `FooterAndProfiles` tests fail or error. Footer tests: `AssertionError … not found in`. The LinkedIn test: `KeyError: 'profiles'`, because the config has no profiles yet. `test_no_linkedin…` passes, and the 9 site-parts tests pass.

- [ ] **Step 3: Implement**

`startup/site-config.json`:

```json
{
  "canonical_origin": "https://biro.dev",
  "contact_email": "founder@biro.dev",
  "indexing_enabled": true,
  "profiles": {
    "github": "https://github.com/jonbiro",
    "linkedin": ""
  }
}
```

In `startup/fragments/about.html`, replace `<a class="text-link founder-contact" href="/contact/">Connect with Jonathan</a>` with `<a class="text-link founder-contact" href="/contact/">Connect with Jonathan</a>{{PROFILE_LINKS}}`.

In `startup/fragments/contact.html`, replace `<a class="contact-address" href="{{EMAIL_URL}}">{{EMAIL}}</a>` with `<a class="contact-address" href="{{EMAIL_URL}}">{{EMAIL}}</a>{{PROFILE_LINKS}}`.

Append to `startup/styles/components/footer.css`:

```css
.footer-status{display:block;margin-top:14px}
```

Apply these `generate.py` edits with this script. It asserts that each anchor occurs exactly once:

```bash
cd startup && python3 - <<'EOF'
from pathlib import Path
p = Path('generate.py'); t = p.read_text()
def sub(old, new):
    global t
    assert t.count(old) == 1, old[:80]
    t = t.replace(old, new)
sub("from pathlib import Path\nimport json, re\n", "from pathlib import Path\nimport json, os, re\n")
sub("from product_pages import render_product\n", "from product_pages import render_product\nfrom site_parts import profile_links, render_profile_links, status_pill, where_things_stand\n")
sub("OUT = ROOT / 'dist'\nCONFIG = json.loads((ROOT / 'site-config.json').read_text())",
    "# Tests may render into another directory with another config; Netlify uses the defaults.\n"
    "OUT = Path(os.environ.get('BIRO_SITE_OUT', ROOT / 'dist'))\n"
    "CONFIG = json.loads(Path(os.environ.get('BIRO_SITE_CONFIG', ROOT / 'site-config.json')).read_text())")
sub("ROBOTS_POLICY = 'index,follow' if INDEXING_ENABLED else 'noindex,nofollow'\n",
    "ROBOTS_POLICY = 'index,follow' if INDEXING_ENABLED else 'noindex,nofollow'\nPROFILE_LINKS = profile_links(CONFIG)\n")
sub("    css = '\\n'.join((STYLE_DIR / name).read_text().strip() for name in STYLE_SOURCES)\n",
    "    css = '\\n'.join((STYLE_DIR / name).read_text().strip() for name in STYLE_SOURCES)\n    (OUT / 'assets').mkdir(parents=True, exist_ok=True)\n")
sub("about = (ROOT / 'fragments/about.html').read_text()",
    "about = (ROOT / 'fragments/about.html').read_text().replace('{{PROFILE_LINKS}}', f'<p class=\"founder-profiles\">{render_profile_links(PROFILE_LINKS, \"text-link\")}</p>' if PROFILE_LINKS else '')")
sub("contact = (ROOT / 'fragments/contact.html').read_text()\n",
    "contact = (ROOT / 'fragments/contact.html').read_text().replace('{{PROFILE_LINKS}}', f'<p class=\"contact-profiles\">{render_profile_links(PROFILE_LINKS, \"text-link\")}</p>' if PROFILE_LINKS else '')\n")
sub("<br><span class=\"pill\">Products in development</span></p>",
    "{FOOTER_PROFILES}<span class=\"footer-status\">Biro.dev is pre-release. Concepts and artwork are illustrative, not released apps.</span></p>")
sub("favicon = \"data:image/svg+xml,",
    "FOOTER_PROFILES = ''.join('<br>' + render_profile_links([link], 'footer-email') for link in PROFILE_LINKS)\nfavicon = \"data:image/svg+xml,")
p.write_text(t); print('generate.py updated')
EOF
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd startup && python3 generate.py >/dev/null && python3 -m unittest discover -s tests -p 'test_*.py'`
Expected: PASS, 13 tests.

- [ ] **Step 5: Run the rule check and the accessibility suite**

Run: `cd startup && python3 tools/csskit.py check dist/assets/site.css --html dist && npm --prefix qa test 2>&1 | tail -1`
Expected: `OK: stylesheet satisfies the Foundation rules.` and `198 passed`.

- [ ] **Step 6: Commit**

```bash
git add startup/tests/pagecheck.py startup/tests/test_pages.py startup/site-config.json startup/generate.py startup/fragments/about.html startup/fragments/contact.html startup/styles/components/footer.css startup/dist
git commit -m "Add founder profile links, the footer status line, and page tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Home as a seven-section reviewer story

**Files:**
- Modify: `startup/generate.py` (the `concept` and `home` definitions and the two `home = home.replace(...)` lines), `startup/fragments/portfolio-teaser.html`
- Delete: `startup/fragments/home-thesis.html` (its content moves into Home's second section)
- Test: `startup/tests/test_pages.py` (add `Home`)

**Interfaces:**
- Consumes: `status_pill`, `where_things_stand`, `render_profile_links`, `PROFILE_LINKS` (Tasks 1–2); the existing `section_intro`, `cards` and `concept` in `generate.py`.

- [ ] **Step 1: Write the failing tests**

Append to `startup/tests/test_pages.py`, above `if __name__`:

```python
def first_eyebrow(node):
    eyebrow = node.find(cls='eyebrow')
    return eyebrow.text() if eyebrow else None


class Home(unittest.TestCase):
    def setUp(self):
        from pagecheck import main_sections
        self.root = load('/')
        self.sections = main_sections(self.root)

    def test_seven_sections_in_the_reviewer_order(self):
        self.assertEqual([first_eyebrow(s) for s in self.sections],
                         ['AI-POWERED ASSISTIVE TECHNOLOGY', 'WHY WE’RE HERE', 'OUR FIRST PRODUCT', 'WHERE THINGS STAND',
                          'HOW WE BUILD', 'BEYOND THE FLAGSHIP', 'FOUNDED WITH PURPOSE'])

    def test_hero_leads_with_the_working_demo(self):
        hero = self.sections[0]
        button = hero.find(cls='button')
        self.assertEqual((button.text(), button.attrs['href']), ('Try the working demo', '/addvancedfocus/#concept-demo'))
        self.assertIn('Meet AddvancedFocus', [a.text() for a in hero.find_all(cls='text-link')])
        self.assertIn('Biro.dev is building affordable, accessible software for neurodivergent people', hero.text())
        self.assertEqual(hero.find(cls='micro').text(), 'Founded in Los Angeles by Jonathan Biro · Pre-release')

    def test_concept_card_has_no_status_pill_and_links_to_the_demo(self):
        card = self.root.find(cls='concept')
        self.assertIsNone(card.find(cls='pill'))
        self.assertIn('Try the working demo', card.text())

    def test_flagship_section_uses_the_status_pill_without_small_print(self):
        feature = self.sections[2]
        self.assertEqual([p.text() for p in feature.find_all(cls='pill')], ['In development'])
        self.assertIsNone(feature.find(cls='micro'))

    def test_how_we_build_has_four_true_proof_points(self):
        section = self.sections[4]
        self.assertEqual(len(section.find_all(cls='card')), 4)
        text = section.text()
        self.assertIn('This website has no sign-up, live AI request, analytics script, or marketing cookie.', text)
        self.assertIn('stop a session without marking the step complete', text)
        hrefs = [a.attrs.get('href') for a in section.find_all(tag='a')]
        self.assertIn('/accessibility/', hrefs)
        self.assertIn('/mission/', hrefs)

    def test_teaser_and_founder_close(self):
        teaser, close = self.sections[5], self.sections[6]
        self.assertIn('Early concepts, each with its own page.', teaser.text())
        self.assertIsNone(teaser.find(cls='micro'))
        self.assertIn('Biro.dev was founded by Jonathan Biro in Los Angeles.', close.text())
        self.assertEqual(profile_hrefs(close), [GITHUB])
        self.assertEqual(close.find(cls='button').text(), 'Talk with the founder')

    def test_removed_sections_are_gone(self):
        for cls in ('principle-strip', 'founder-teaser'):
            self.assertIsNone(self.root.find(cls=cls), cls)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd startup && python3 generate.py >/dev/null && python3 -m unittest discover -s tests -p 'test_*.py'`
Expected: every `Home` test except `test_removed_sections_are_gone` fails. That test also fails on `principle-strip`.

- [ ] **Step 3: Implement**

Replace the teaser intro in `startup/fragments/portfolio-teaser.html`:
- `<p>Our future product family explores care coordination, visual preparation, comprehension, daily living, communication, sensory access, and scam awareness.</p>` → `<p>Early concepts, each with its own page.</p>`
- Remove `<p class="micro">Early concepts under development. No public release dates announced.</p>`

Then run:

```bash
cd startup && git rm -q fragments/home-thesis.html && python3 - <<'EOF'
from pathlib import Path
p = Path('generate.py'); lines = p.read_text().split('\n')
def take(prefix):
    hits = [i for i, line in enumerate(lines) if line.startswith(prefix)]
    assert len(hits) == 1, (prefix, len(hits))
    return hits[0]
# concept card: drop the status pill, point the link at the working demo
i = take("concept = '''")
assert '<span class="pill">Product concept</span>' in lines[i] and '>Try the interactive concept</a>' in lines[i]
lines[i] = lines[i].replace('<span class="pill">Product concept</span>', '').replace('>Try the interactive concept</a>', '>Try the working demo</a>')
# Home: replace the old definition and remove its two patch lines
del lines[take("home = home.replace('<section class=\"section wrap founder-teaser\">'")]
del lines[take("home = home.replace(cta(), (ROOT / 'fragments/portfolio-teaser.html')")]
lines[take("home = f'''")] = r'''HOW_WE_BUILD = ('<section class="section wrap" id="how-we-build">'
    + section_intro('HOW WE BUILD', 'Care belongs<br>in the details.', 'These principles guide the choices we’re making as we develop our products.')
    + cards([('Accessibility', 'WCAG 2.2 Level AA is the design target for this website. <a class="text-link" href="/accessibility/">Read the accessibility statement</a>'),
             ('Privacy', 'This website has no sign-up, live AI request, analytics script, or marketing cookie.'),
             ('User autonomy', 'In the demo, you can stop a session without marking the step complete, and undo a completion.'),
             ('Affordability', 'Practical value at an accessible price is a design requirement. Pricing has not been set.')])
    + '<a class="text-link" href="/mission/">Read our design commitments</a></section>')
FOUNDER_CLOSE = ('<section class="closing wrap founder-close"><p class="eyebrow">FOUNDED WITH PURPOSE</p><h2>Technology should<br>adapt to people.</h2>'
    '<p>Biro.dev was founded by Jonathan Biro in Los Angeles. ' + render_profile_links(PROFILE_LINKS, 'text-link') + '</p>'
    '<a class="button" href="/contact/">Talk with the founder</a></section>')
home = ('<section class="hero wrap"><div><p class="eyebrow">AI-POWERED ASSISTIVE TECHNOLOGY</p><h1>Life is complex.<br>Support should<br>feel <em>simple.</em></h1>'
    '<p class="intro">Biro.dev is building affordable, accessible software for neurodivergent people, people with disabilities, and families, starting with AddvancedFocus, an executive-function assistant.</p>'
    '<div class="actions"><a class="button" href="/addvancedfocus/#concept-demo">Try the working demo</a><a class="text-link" href="/addvancedfocus/">Meet AddvancedFocus</a></div>'
    '<p class="micro">Founded in Los Angeles by Jonathan Biro · Pre-release</p></div>'
    '<div class="hero-visual"><img decoding="async" class="ribbon" src="/assets/hero.webp" alt="" width="1536" height="1024" fetchpriority="high">' + concept
    + '<p class="visual-caption">Less to hold in your head.<br>More room to be yourself.</p></div></section>'
    + '<section class="section wrap">' + section_intro('WHY WE’RE HERE', 'Knowing what to do<br>is only part of the work.', 'Daily life involves more than keeping a list. It means deciding where to begin, remembering context, adjusting when plans change, and carrying responsibilities that other people may never see.')
    + cards([('Support that meets you where you are', 'For neurodivergent people, individuals with disabilities, and families navigating the demands of daily life.'),
             ('Less effort to get going', 'Tools designed to reduce decisions, make the next step clearer, and help turn intention into action.'),
             ('More room for your life', 'Our goal is practical support that respects your energy, your priorities, and your way of doing things.')]) + '</section>'
    + '<section class="feature-section"><div class="wrap feature"><div><p class="eyebrow">OUR FIRST PRODUCT</p><div class="title-row"><h2>Meet AddvancedFocus.</h2>' + status_pill('development') + '</div>'
    '<p class="large">Help with starting, planning,<br>and keeping everyday life moving.</p><p>Our flagship AI-powered executive-function assistant is being developed to support ADHD, autism, and the everyday work of planning, routines, and household coordination.</p>'
    '<a class="button" href="/addvancedfocus/">Explore AddvancedFocus</a></div><div class="flow-list"><div><span>01</span><h3>Find a starting point</h3><p>Turn a big intention into a manageable first step.</p></div><div><span>02</span><h3>Make a little space</h3><p>Bring plans, routines, and open loops into view.</p></div><div><span>03</span><h3>Begin again, without the guilt</h3><p>Build support around interruptions and changing energy.</p></div></div></div></section>'
    + where_things_stand('compact') + HOW_WE_BUILD + (ROOT / 'fragments/portfolio-teaser.html').read_text() + FOUNDER_CLOSE)'''
p.write_text('\n'.join(lines)); print('home rebuilt')
EOF
```

Remove the rules this task made dead (the principle strip and founder teaser no longer exist), then rebuild:

```bash
cd startup && python3 generate.py >/dev/null && for f in styles/*.css styles/*/*.css; do python3 tools/csskit.py prune "$f" "$f" --html dist | head -1; done && python3 generate.py >/dev/null
```

Expected: `pages/home.css` reports dead selectors, including `.principle-strip …` and `.founder-teaser …`, and every other file reports `Removed 0 dead selectors and 0 overridden declarations.`

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd startup && python3 generate.py >/dev/null && python3 -m unittest discover -s tests -p 'test_*.py'`
Expected: PASS, 20 tests.

- [ ] **Step 5: Run the rule check and the accessibility suite**

Run: `cd startup && python3 tools/csskit.py check dist/assets/site.css --html dist && npm --prefix qa test 2>&1 | tail -1`
Expected: `OK …` and `198 passed`.

- [ ] **Step 6: Commit**

```bash
git add startup/generate.py startup/fragments/portfolio-teaser.html startup/tests/test_pages.py startup/dist
git commit -m "Rebuild Home as a seven-section story led by the working demo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Products from eleven sections to seven

**Files:**
- Modify: `startup/generate.py` (`future_portfolio`, the `products` definition, the `readiness` line, and the products patch lines), `startup/fragments/portfolio-principles.html`, `startup/fragments/portfolio-faq.html`, `startup/fragments/product-guide.html`, `startup/styles/pages/products.css`, `startup/styles/components/readiness.css`
- Delete: `startup/fragments/development.html` (its stages now live in `where_things_stand('full')`)
- Test: `startup/tests/test_pages.py` (add `Products`)

**Interfaces:**
- Consumes: `status_pill`, `where_things_stand` (Task 1); `concept`, `cta` (existing).
- Produces: section ids on `/products/`: `flagship`, `where-things-stand`, `product-guide`, `future-products`, `connected-vision`, `portfolio-questions`.

- [ ] **Step 1: Write the failing tests**

Append to `startup/tests/test_pages.py`, above `if __name__`:

```python
class Products(unittest.TestCase):
    def setUp(self):
        from pagecheck import main_sections
        self.root = load('/products/')
        self.sections = main_sections(self.root)

    def test_seven_parts_in_order(self):
        self.assertIn('page-hero', self.sections[0].classes)
        self.assertEqual([s.attrs.get('id') for s in self.sections[1:7]],
                         ['flagship', 'where-things-stand', 'product-guide', 'future-products', 'connected-vision', 'portfolio-questions'])
        self.assertIn('closing', self.sections[7].classes)
        self.assertEqual(len(self.sections), 8)

    def test_on_page_menu_matches_the_sections(self):
        nav = self.root.find(cls='page-contents')
        self.assertEqual([a.attrs['href'] for a in nav.find_all(tag='a')],
                         ['#flagship', '#where-things-stand', '#product-guide', '#future-products', '#portfolio-questions'])

    def test_flagship_status_and_demo_button(self):
        flagship = self.root.find(id='flagship')
        self.assertEqual([p.text() for p in flagship.find_all(cls='pill')], ['Working demo', 'In development'])
        button = flagship.find(cls='button')
        self.assertEqual((button.text(), button.attrs['href']), ('Try the working demo', '/addvancedfocus/#concept-demo'))
        self.assertEqual(flagship.find(cls='micro').text(), 'Illustrative concept.')

    def test_full_status_block_has_the_development_stages(self):
        block = self.root.find(id='where-things-stand')
        self.assertEqual(len(block.find(cls='development-steps').find_all(tag='li')), 3)

    def test_concept_cards_are_compact(self):
        cards = self.root.find_all(cls='portfolio-card')
        self.assertEqual(len(cards), 8)
        for card in cards:
            self.assertIsNotNone(card.find(cls='app-icon'), card.attrs['id'])
            self.assertEqual([p.text() for p in card.find_all(cls='pill')], ['Concept'], card.attrs['id'])
            self.assertIsNone(card.find(tag='details'), card.attrs['id'])

    def test_connected_vision_holds_the_logo_family(self):
        vision = self.root.find(id='connected-vision')
        self.assertIsNotNone(vision.find(cls='logo-family'))
        self.assertIsNone(vision.find(cls='micro'))

    def test_faq_keeps_only_unanswered_questions(self):
        faq = self.root.find(id='portfolio-questions')
        self.assertEqual([s.text() for s in faq.find_all(tag='summary')],
                         ['How are you deciding what to build first?', 'Can I help shape a product?'])

    def test_word_budget_and_removed_sections(self):
        self.assertLess(len(self.root.find(tag='main').text().split()), 1200)
        for cls in ('notice', 'brand-family'):
            self.assertIsNone(self.root.find(cls=cls), cls)
        self.assertIsNone(self.root.find(id='development'))
        self.assertIsNone(self.root.find(cls='product-guide').find(cls='micro'))
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd startup && python3 generate.py >/dev/null && python3 -m unittest discover -s tests -p 'test_*.py'`
Expected: every `Products` test fails, for example `test_seven_parts_in_order` on the section ids.

- [ ] **Step 3: Implement the fragment and style edits**

`startup/fragments/portfolio-principles.html`:
- `<section class="feature-section">` → `<section class="feature-section" id="connected-vision" tabindex="-1">`
- Remove `<p class="micro">This is a future design direction. Cross-product connections and offline capabilities have not been released; pricing and technical details remain in development.</p>`

`startup/fragments/portfolio-faq.html`: remove the two `<details>` elements whose summaries are "Are all of these apps available?" and "Would I need to use the whole family of apps?". Keep the other two unchanged.

`startup/fragments/product-guide.html`: remove `<p class="micro">AddvancedFocus is the flagship in development. All other products are early concepts. No applications are publicly released through this website.</p>`.

Append `.product-large .pill+.pill{margin-left:.5rem}` to `startup/styles/pages/products.css`, and `.readiness .where-stages{margin-top:3rem}` to `startup/styles/components/readiness.css`.

- [ ] **Step 4: Implement the generator changes**

```bash
cd startup && git rm -q fragments/development.html && python3 - <<'EOF'
import re
from pathlib import Path
p = Path('generate.py'); t = p.read_text()
# 1. Compact concept cards with app icons and the Concept pill; no capability panels.
start = t.index('def future_portfolio():'); end = t.index("\nconcept = '''")
t = t[:start] + r'''def future_portfolio():
    items = json.loads((ROOT / 'portfolio.json').read_text())
    rendered = []
    for item in items:
        slug, name = item['slug'], escape(item['name'])
        rendered.append(f'<article class="portfolio-card" id="{slug}" tabindex="-1" aria-labelledby="{slug}-title"><img class="app-icon" src="/assets/products/icons/{slug}.webp" alt="" width="44" height="44" loading="lazy" decoding="async"><p class="eyebrow">{escape(item["category"])}</p><h3 id="{slug}-title">{name}</h3><p class="portfolio-tagline">{escape(item["tagline"])}</p>{status_pill("concept")}<p>{escape(item["description"])}</p><a class="text-link portfolio-page-link" href="/{slug}/">Explore {name}</a></article>')
    return ('<section class="section wrap portfolio-section" id="future-products" tabindex="-1" aria-labelledby="portfolio-heading"><div class="section-intro"><p class="eyebrow">THE FUTURE PRODUCT FAMILY</p><h2 id="portfolio-heading">Different needs.<br>One shared commitment.</h2><p>Each concept addresses a distinct everyday challenge and has its own page with the intended workflow, planned capabilities, and questions.</p></div>'
            '<nav class="portfolio-index" aria-label="Future product index">' + ''.join(f'<a href="#{x["slug"]}">{escape(x["name"])}</a>' for x in items) + '</nav><div class="portfolio-grid">' + ''.join(rendered) + '</div></section>')

''' + t[end:]
lines = t.split('\n')
def take(prefix):
    hits = [i for i, line in enumerate(lines) if line.startswith(prefix)]
    assert len(hits) == 1, (prefix, len(hits))
    return hits[0]
# 2. Remove the old readiness block and every products patch line.
for prefix in ("readiness = '''", "products = products.replace(cta(), (ROOT / 'fragments/product-guide.html')",
               "products = products.replace(cta(), (ROOT / 'fragments/development.html')",
               "products = products.replace('<section class=\"section wrap faq\" id=\"portfolio-questions\"",
               "products = products.replace('<section class=\"wrap product-large\">'",
               "products = products.replace('</p></section><section class=\"wrap product-large\"'"):
    del lines[take(prefix)]
# 3. Products as an explicit ordered list of sections.
lines[take("products = '''")] = r'''LOGO_FAMILY = '<div class="wrap"><figure class="logo-family"><img src="/assets/products/logo-family.webp" alt="Concept logo collection: AddvancedFocus, CareBridge, StoryReady, ClearCue, PlainPath, StepAble, SayAble, SensoryScout, and OpenCall." width="1536" height="1024" loading="lazy" decoding="async"><figcaption>Exploratory app logos. Product identities may evolve during development.</figcaption></figure></div>'
principles = (ROOT / 'fragments/portfolio-principles.html').read_text().strip()
assert principles.endswith('</div></section>')
products = ('<section class="page-hero wrap"><p class="eyebrow">OUR PRODUCTS</p><h1>Less friction.<br><em>More possibility.</em></h1><p class="intro">A family of AI-powered assistive applications for everyday independence, led by AddvancedFocus.</p>'
    '<nav class="page-contents" aria-label="On the products page"><a href="#flagship">Flagship</a><a href="#where-things-stand">Where things stand</a><a href="#product-guide">Find your starting point</a><a href="#future-products">Concepts</a><a href="#portfolio-questions">Questions</a></nav></section>'
    '<section class="wrap product-large" id="flagship" tabindex="-1"><div>' + status_pill('demo') + status_pill('development') + '<h2>AddvancedFocus</h2><p class="large">An executive-function assistant<br>built around real life.</p>'
    '<p>We’re developing AI-powered support for getting started, building routines, planning, and managing household responsibilities—with ADHD and autism among the needs informing its design.</p>'
    '<div class="tags"><span>Task initiation</span><span>Routines</span><span>Planning</span><span>Household mental load</span></div>'
    '<div class="actions"><a class="button" href="/addvancedfocus/#concept-demo">Try the working demo</a><a class="text-link" href="/addvancedfocus/">Explore AddvancedFocus</a></div></div>'
    '<div class="product-art">' + concept + '<p class="micro">Illustrative concept.</p></div></section>'
    + where_things_stand('full') + (ROOT / 'fragments/product-guide.html').read_text() + future_portfolio()
    + principles[:-len('</section>')] + LOGO_FAMILY + '</section>'
    + (ROOT / 'fragments/portfolio-faq.html').read_text() + cta())'''
p.write_text('\n'.join(lines)); print('products rebuilt')
EOF
```

Remove the rules this task made dead, then rebuild:

```bash
cd startup && python3 generate.py >/dev/null && for f in styles/*.css styles/*/*.css; do python3 tools/csskit.py prune "$f" "$f" --html dist | head -1; done && python3 generate.py >/dev/null
```

Expected: `pages/products.css` reports dead selectors built on `.portfolio-detail`, `.portfolio-image-link` and `.brand-family`. Every other file reports `Removed 0 …`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd startup && python3 generate.py >/dev/null && python3 -m unittest discover -s tests -p 'test_*.py'`
Expected: PASS, 28 tests. If `test_word_budget_and_removed_sections` fails on the word count, print `len(load('/products/').find(tag='main').text().split())` and the five longest sections. Trim only by removing duplicated sentences that `where_things_stand` already says, and record each removed sentence in the PR copy table. Never add new copy to make room.

- [ ] **Step 6: Run the rule check and the accessibility suite**

Run: `cd startup && python3 tools/csskit.py check dist/assets/site.css --html dist && npm --prefix qa test 2>&1 | tail -1`
Expected: `OK …` and `198 passed`.

- [ ] **Step 7: Commit**

```bash
git add startup/generate.py startup/fragments startup/styles startup/tests/test_pages.py startup/dist
git commit -m "Restructure Products into seven sections around one status block

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: AddvancedFocus page and the eight product pages

**Files:**
- Modify: `startup/generate.py` (the `addvancedfocus` definition and its patch lines), `startup/fragments/addvancedfocus-demo.html`, `startup/product_pages.py`, `startup/portfolio.json`, `startup/styles/pages/addvancedfocus.css`
- Test: `startup/tests/test_pages.py` (add `AddvancedFocusPage`, `ProductPages`)

**Interfaces:**
- Consumes: `status_pill`, `where_things_stand` (Task 1).

- [ ] **Step 1: Write the failing tests**

Append to `startup/tests/test_pages.py`, above `if __name__`:

```python
PRODUCT_SLUGS = ['carebridge', 'storyready', 'clearcue', 'plainpath', 'stepable', 'sayable', 'sensoryscout', 'opencall']


class AddvancedFocusPage(unittest.TestCase):
    def setUp(self):
        from pagecheck import main_sections
        self.root = load('/addvancedfocus/')
        self.sections = main_sections(self.root)

    def test_demo_comes_right_after_the_hero(self):
        self.assertIn('af-product-hero', self.sections[0].classes)
        self.assertEqual(self.sections[1].attrs.get('id'), 'concept-demo')
        self.assertIn('app-mockup', self.sections[2].classes)

    def test_status_pills(self):
        hero_pills = [p.text() for p in self.sections[0].find_all(cls='pill')]
        self.assertEqual(hero_pills, ['In development'])
        heading = self.root.find(cls='concept-section-heading')
        self.assertEqual([p.text() for p in heading.find_all(cls='pill')], ['Working demo'])

    def test_status_block_replaces_two_faq_answers(self):
        ids = [s.attrs.get('id') for s in self.sections]
        faq = next(s for s in self.sections if 'faq' in s.classes)
        self.assertLess(ids.index('where-things-stand'), self.sections.index(faq))
        self.assertEqual([s.text() for s in faq.find_all(tag='summary')],
                         ['Who is it being designed for?', 'How will personal information be handled?', 'Is AddvancedFocus a medical product?'])

    def test_duplicate_small_print_is_gone(self):
        text = self.root.find(tag='main').text()
        self.assertNotIn('A working illustration of the idea', text)
        self.assertNotIn('The final AI implementation and data practices will be explained', text)
        self.assertEqual(self.sections[0].find(cls='button').text(), 'Try the working demo')


class ProductPages(unittest.TestCase):
    def test_each_product_page_uses_the_concept_status(self):
        portfolio = {item['slug']: item for item in json.loads((ROOT / 'portfolio.json').read_text())}
        for slug in PRODUCT_SLUGS:
            root = load(f'/{slug}/')
            brief = root.find(cls='product-brief')
            self.assertEqual([p.text() for p in brief.find_all(cls='pill')], ['Concept'], slug)
            self.assertIsNone(brief.find(cls='micro'), slug)
            self.assertIn('Not a released application', root.find(tag='figcaption').text(), slug)
            summaries = [s.text() for s in root.find(id='questions').find_all(tag='summary')]
            self.assertIn(f'When can I use {portfolio[slug]["name"]}?', summaries, slug)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd startup && python3 generate.py >/dev/null && python3 -m unittest discover -s tests -p 'test_*.py'`
Expected: every `AddvancedFocusPage` test fails, and `ProductPages` fails on `['Future product · Concept development'] != ['Concept']`.

- [ ] **Step 3: Implement the fragment, product-page and data edits**

`startup/fragments/addvancedfocus-demo.html`: replace `<p class="eyebrow">TRY A SMALL PART OF THE IDEA</p><h2 id="concept-heading">` with `<p class="eyebrow">TRY A SMALL PART OF THE IDEA</p><span class="pill">Working demo</span><h2 id="concept-heading">`.

Append `.concept-section-heading .eyebrow+.pill{display:inline-block;margin-bottom:1.25rem}` to `startup/styles/pages/addvancedfocus.css`.

`startup/product_pages.py`:
- add `from site_parts import status_pill` after the existing imports
- replace `<span class="pill">Future product · Concept development</span>` with `{status_pill("concept")}`. Use double quotes inside the expression, so the f-string also parses on Python versions before 3.12.
- remove `<p class="micro">Planned capabilities, not a released application. Availability, platforms, and pricing have not been announced.</p>`

`startup/portfolio.json`: in the two FAQ answers that end with "have not been announced.", change only that ending to "are still being decided.":
- "Specific supported technologies and platforms are still being decided."
- "Live coverage, specific data sources, and participating venues are still being decided."

Confirm with `grep -c "have not been announced" startup/portfolio.json` → `0`.

- [ ] **Step 4: Implement the page composition**

```bash
cd startup && python3 - <<'EOF'
from pathlib import Path
p = Path('generate.py'); lines = p.read_text().split('\n')
def take(prefix):
    hits = [i for i, line in enumerate(lines) if line.startswith(prefix)]
    assert len(hits) == 1, (prefix, len(hits))
    return hits[0]
for prefix in ("addvancedfocus = addvancedfocus.replace('<section id=\"explore\"",
               "addvancedfocus = addvancedfocus.replace('<section class=\"feature-section\"><div class=\"wrap section\"><p class=\"eyebrow\">THOUGHTFUL USE OF AI</p>'",
               "addvancedfocus = addvancedfocus.replace('<section class=\"concept-section wrap\"'"):
    del lines[take(prefix)]
lines[take("addvancedfocus = '''")] = r'''AF_MOCKUP = '<figure class="wrap app-mockup"><img src="/assets/products/addvancedfocus.webp" alt="AddvancedFocus concept interface and app icon, showing one small next step and a short focus session." width="1536" height="1024" loading="lazy" decoding="async"><figcaption><span>AddvancedFocus · Interface and logo concept</span><span>Illustrative design. Try the working website prototype below.</span></figcaption></figure>'
addvancedfocus = ('<section class="wrap af-product-hero"><div><p class="eyebrow">MEET ADDVANCEDFOCUS</p>' + status_pill('development') + '<h1>Less deciding.<br><em>More beginning.</em></h1>'
    '<p class="intro">An AI-powered executive-function assistant being developed for ADHD, autism, and the everyday work of starting, planning, and following through.</p>'
    '<div class="actions"><a class="button" href="#concept-demo">Try the working demo</a><a class="text-link" href="#explore">See the product direction</a></div></div>'
    '<div class="af-product-promise"><p class="eyebrow">SUPPORT THAT STAYS WITH YOU</p><h2>Find a next step.<br>Make it doable.<br>Know where to return.</h2><p>Keep one action in focus. Give the rest a place to wait. Build a way back when life interrupts.</p></div></section>'
    + (ROOT / 'fragments/addvancedfocus-demo.html').read_text() + AF_MOCKUP + (ROOT / 'fragments/focus-everyday.html').read_text()
    + '<section id="explore" tabindex="-1" class="section wrap">' + section_intro('WHAT WE’RE WORKING TOWARD', 'Support for the work<br>behind everyday life.', 'These are AddvancedFocus’s intended areas of support. Specific capabilities are still in development.')
    + cards([('Starting tasks', 'Turn an intention into one concrete first step, sized to the energy and time available.'),
             ('Routines that can flex', 'Support everyday sequences while making room for changing schedules, energy, and needs.'),
             ('Plans that feel manageable', 'Separate Now, Today, Upcoming, and Later so one useful action can stand out without losing the rest.'),
             ('A lighter household load', 'Explore ways to make responsibilities, follow-ups, and the things people keep in their heads easier to see.'),
             ('A way back after interruptions', 'Pause with a short return note, preserve the next step, and make re-entry easier after an interruption.'),
             ('Choice at every step', 'Offer understandable suggestions that people can change or decline. Assistance should strengthen agency.')]) + '</section>'
    + (ROOT / 'fragments/product-intelligence.html').read_text()
    + '<section class="feature-section"><div class="wrap section"><p class="eyebrow">THOUGHTFUL USE OF AI</p><h2>Helpful suggestions.<br>Your decisions.</h2><p class="wide-copy">We’re exploring AI that helps turn loosely described intentions into concrete first steps, simplify plans, and clarify what needs attention. We’re designing around understandable suggestions, clear choices, and respect for personal information.</p></div></section>'
    + where_things_stand('compact')
    + '<section class="section wrap faq"><p class="eyebrow">A FEW THINGS TO KNOW</p><h2>A few more questions.</h2>'
    '<details><summary>Who is it being designed for?</summary><p>AddvancedFocus is being developed with neurodivergent people in mind, including people with ADHD and autism, as well as families managing everyday executive-function demands. Individual needs vary; our goal is flexible support.</p></details>'
    '<details><summary>How will personal information be handled?</summary><p>Privacy is a design priority. Specific data collection, storage, AI processing, and user controls are still being defined. We’ll publish those details before people are asked to entrust the product with their information.</p></details>'
    '<details><summary>Is AddvancedFocus a medical product?</summary><p>AddvancedFocus is being developed for practical everyday support. It is not presented as a diagnostic tool, treatment, or replacement for professional care.</p></details></section>'
    + cta())'''
p.write_text('\n'.join(lines)); print('addvancedfocus rebuilt')
EOF
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd startup && python3 generate.py >/dev/null && python3 -m unittest discover -s tests -p 'test_*.py' && node check-concept.cjs`
Expected: PASS, 33 tests, and both concept checks `PASS`.

- [ ] **Step 6: Run the rule check and the accessibility suite**

Run: `cd startup && python3 tools/csskit.py check dist/assets/site.css --html dist && npm --prefix qa test 2>&1 | tail -1`
Expected: `OK …` and `198 passed`. The keyboard `demo` tests must pass unchanged.

- [ ] **Step 7: Commit**

```bash
git add startup/generate.py startup/fragments/addvancedfocus-demo.html startup/product_pages.py startup/portfolio.json startup/styles startup/tests/test_pages.py startup/dist
git commit -m "Lead AddvancedFocus with the demo and apply the status system to product pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Sitewide status rules, Contact, About and the accessibility statement

**Files:**
- Modify: `startup/fragments/contact.html`, `startup/fragments/about.html`, `startup/generate.py` (accessibility statement review note)
- Test: `startup/tests/test_pages.py` (add `Sitewide`)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write the failing tests**

Append to `startup/tests/test_pages.py`, above `if __name__`:

```python
PHRASES = ('not a released', 'not yet publicly available', 'release timing', 'have not been announced', 'pre-release')


def allowed_context(route, node):
    chain = list(node.ancestors())
    if route == '/accessibility/':
        return True
    if any(n.tag in ('figcaption', 'footer') or n.attrs.get('id') in ('where-things-stand', 'privacy') for n in chain):
        return True
    return route == '/' and 'micro' in node.classes and any('hero' in n.classes for n in chain)


class Sitewide(unittest.TestCase):
    def test_status_phrases_appear_only_in_allowed_places(self):
        offenders = []
        for route in ROUTES:
            body = load(route).find(tag='body')
            for text, parent in body.strings():
                lowered = text.lower()
                if any(phrase in lowered for phrase in PHRASES) and not allowed_context(route, parent):
                    offenders.append(f'{route}: {" ".join(text.split())[:90]}')
        self.assertEqual(offenders, [])

    def test_cross_page_anchors_resolve(self):
        broken = []
        for route in ROUTES:
            for a in load(route).find_all(tag='a'):
                href = a.attrs.get('href', '')
                if href.startswith('/') and '#' in href:
                    target, fragment = href.split('#', 1)
                    if fragment and load(target or route).find(id=fragment) is None:
                        broken.append(f'{route} → {href}')
        self.assertEqual(broken, [])

    def test_mission_keeps_the_shared_connected_vision_section(self):
        root = load('/mission/')
        vision = root.find(id='connected-vision')
        self.assertIsNotNone(vision)
        self.assertIn('Useful on its own.', vision.text())
        self.assertIsNone(vision.find(cls='logo-family'))
        self.assertIsNotNone(root.find(id='privacy'))

    def test_contact_stage_points_to_where_things_stand(self):
        stage = load('/contact/').find(cls='contact-stage')
        self.assertEqual([p.text() for p in stage.find_all(cls='pill')], ['In development'])
        self.assertIn('/products/#where-things-stand', [a.attrs.get('href') for a in stage.find_all(tag='a')])

    def test_about_stage_uses_the_status_label(self):
        facts = load('/about/').find(cls='company-facts')
        stage = next(div for div in facts.find_all(tag='div') if div.find(tag='dt').text() == 'Current stage')
        self.assertEqual(stage.find(tag='dd').text(), 'In development')

    def test_accessibility_statement_describes_the_current_checks(self):
        text = load('/accessibility/').find(tag='main').text()
        self.assertIn('Reviewed October 9, 2026', text)
        self.assertIn('Performed in Chromium and WebKit using automated (axe) and keyboard checks.', text)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd startup && python3 generate.py >/dev/null && python3 -m unittest discover -s tests -p 'test_*.py'`
Expected failures:
- `test_status_phrases_…`, listing `/about/: Product development · Pre-release` and the `/contact/` stage sentence.
- `test_contact_stage_…`
- `test_about_stage_…`
- `test_accessibility_statement_…`

`test_cross_page_anchors_resolve` and the Mission test should already pass. If either fails, fix the dangling link the test names, using the section ids from Task 4.

- [ ] **Step 3: Implement**

`startup/fragments/contact.html`: replace the whole `<div class="contact-stage">…</div>` with:

```html
<div class="contact-stage"><span class="pill">In development</span><p class="micro"><a href="/products/#where-things-stand">Where things stand</a> lists what exists today and what is not yet decided.</p></div>
```

`startup/fragments/about.html`: replace `<dd>Product development · Pre-release</dd>` with `<dd>In development</dd>`.

In `startup/generate.py`:
- replace `<span class="pill">Reviewed October 8, 2026</span>` with `<span class="pill">Reviewed October 9, 2026</span>`
- replace `Performed in a Chromium-based browser using automated and keyboard checks.` with `Performed in Chromium and WebKit using automated (axe) and keyboard checks.`

These checks are what the Foundation QA toolkit now runs on every change, so the statement stays accurate.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd startup && python3 generate.py >/dev/null && python3 -m unittest discover -s tests -p 'test_*.py'`
Expected: PASS, 39 tests.

- [ ] **Step 5: Run the rule check and the accessibility suite**

Run: `cd startup && python3 tools/csskit.py check dist/assets/site.css --html dist && npm --prefix qa test 2>&1 | tail -1`
Expected: `OK …` and `198 passed`.

- [ ] **Step 6: Commit**

```bash
git add startup/fragments/contact.html startup/fragments/about.html startup/generate.py startup/tests/test_pages.py startup/dist
git commit -m "Enforce the status phrases sitewide and point Contact and About at the status block

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Visual report, copy table and pull request

**Files:**
- Modify: `startup/README.md`
- Create (not committed): the pull request body and copy table in the scratchpad

**Interfaces:**
- Consumes: everything above; the Foundation QA toolkit.

- [ ] **Step 1: Document the page tests**

In `startup/README.md`, append to the "Quality checks" section:

```markdown
Page tests pin the site's structure and copy rules: section order, status labels, the places status small print may appear, cross-page anchors, and profile links. Run them after `python3 generate.py`:

    python3 -m unittest discover -s tests -p 'test_*.py'

Founder profile links come from `profiles` in `site-config.json`; a link renders only for an `https://` URL.
```

- [ ] **Step 2: Produce the visual change report**

Run:

```bash
cd ~/Projects/biro-dev-site && git worktree add ../biro-dev-foundation claude/foundation
cd startup/qa
QA_DIST="$HOME/Projects/biro-dev-foundation/startup/dist" node snapshot.mjs .snapshots/messaging-before
node snapshot.mjs .snapshots/messaging-after
node compare.mjs .snapshots/messaging-before .snapshots/messaging-after > /tmp/messaging-compare.txt; tail -1 /tmp/messaging-compare.txt
grep -E "difference\(s\)$|pixel|size changed" /tmp/messaging-compare.txt | sed -E 's#^([a-z-]+)/([0-9]+)/([a-z0-9]+)\..*#\3#' | sort | uniq -c
```

Expected: `FAIL: …`, because pages intentionally changed. The per-page list covers every route, since the footer changed on all of them. Home, Products, AddvancedFocus, About, Contact, the 8 product pages, Mission and Accessibility carry content changes. Attach the per-page counts to the PR.

- [ ] **Step 3: Produce the before/after copy table**

Run:

```bash
cd ~/Projects/biro-dev-site/startup && python3 - <<'EOF' > /tmp/messaging-copy.md
import difflib, re, html
from pathlib import Path
before_root = Path.home() / 'Projects/biro-dev-foundation/startup/dist'
after_root = Path('dist')
def sentences(path):
    text = re.search(r'<main.*?</main>', path.read_text(), re.S).group(0)
    text = html.unescape(re.sub(r'<[^>]+>', ' \n', text))
    return [s for s in (' '.join(line.split()) for line in text.split('\n')) if len(s) > 3]
print('| Page | Removed | Added |\n| --- | --- | --- |')
for after in sorted(after_root.rglob('index.html')):
    rel = after.relative_to(after_root)
    if rel.parts[0] in ('focusflow',):
        continue
    before = before_root / rel
    diff = list(difflib.ndiff(sentences(before), sentences(after)))
    removed = [d[2:] for d in diff if d.startswith('- ')]
    added = [d[2:] for d in diff if d.startswith('+ ')]
    if removed or added:
        print(f"| /{rel.parent.as_posix().strip('.')} | {'<br>'.join(removed)} | {'<br>'.join(added)} |")
EOF
wc -l /tmp/messaging-copy.md
```

Expected: one table row per changed page. Read every "Added" cell against the Global Constraints copy rule. Each added sentence must be either a condensed existing sentence or a demo-behaviour description. If one is neither, fix it in the source, regenerate, and rerun Tasks 2–6 tests before continuing.

- [ ] **Step 4: Final verification**

Run:

```bash
cd ~/Projects/biro-dev-site/startup
python3 generate.py >/dev/null && python3 -m unittest discover -s tests -p 'test_*.py' 2>&1 | tail -1
python3 -m unittest discover -s tools -p 'test_*.py' 2>&1 | tail -1
python3 tools/csskit.py check dist/assets/site.css --html dist
node check-concept.cjs
npm --prefix qa test 2>&1 | tail -1
git diff --stat claude/foundation -- ../netlify.toml dist/_redirects dist/assets/site.js dist/assets/concept-model.js dist/assets/products dist/assets/hero.webp dist/og.jpg
```

Expected: `OK` (39 tests), `OK` (55 tests), `OK: stylesheet satisfies the Foundation rules.`, concept checks `PASS PASS`, `198 passed`, and no output from the last command.

- [ ] **Step 5: Commit, push and open the pull request**

```bash
git add startup/README.md
git commit -m "Document the page tests and profile-link configuration

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin claude/messaging
gh pr create --base claude/foundation --head claude/messaging --title "Messaging & structure: status system, reviewer-first Home, leaner Products" --body-file /tmp/messaging-pr.md
git worktree remove ../biro-dev-foundation
```

Write `/tmp/messaging-pr.md` before running `gh pr create`. It must contain:
- the summary of sections 1–5 of the spec
- the test results from Step 4
- the per-page compare counts from Step 2
- the full copy table from Step 3
- the `/products/` word count before and after
- this final line: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

Do not merge. The user decides.
