# Credibility: "How the work is checked"

Sub-project 4 of the site improvement. Approved in conversation on 2026-10-09.

## Intent

The site is reviewer-first: it is written for people evaluating an early-stage company. A reviewer should leave trusting that Biro.dev builds carefully and tells the truth. This sub-project gets there without any new claim. It makes the proof the site already contains visible, and connects the founder's QA-automation background to how the work is done.

## Decisions (from the user)

- **No new facts.** Only what the site already states or demonstrates. Nothing is added about customers, funding, partnerships, release dates, clinical results, AI providers, employers or numbers.
- **No repository link.** Testing is described in words only.
- **Approach 1:** one section on About, plus one link from Home. Not proof woven through every page, and not a new page.

## Design

### About: new section

- **Placement:** directly after the founder layout ("A practical approach to a meaningful problem.") and before "How we approach the work".
- **Markup:** `<section class="section wrap" id="how-the-work-is-checked" tabindex="-1" aria-labelledby="how-checked-title">`, built with the existing `section_intro()` and `cards()` helpers, so the cards are ruled and numbered as everywhere else.
- **Copy (exact):**
  - Eyebrow: `HOW THE WORK IS CHECKED`
  - Heading: `Checked before <br>it’s claimed.`
  - Intro: `Jonathan’s background is in QA automation, so this website is held to the same standard. Each claim below points to something you can check yourself.`
  - Cards, each body ending in a text link:
    1. **A demo you can operate.** "The AddvancedFocus concept is interactive: three everyday situations, two energy levels, a session you can pause with a note, and a completion you can undo. It runs in your browser on scripted examples, not live AI." Link: "Try the working demo" → `/addvancedfocus/#concept-demo`
    2. **Tested in more than one browser.** "Every page is checked with automated tests in Chromium and WebKit, at phone and desktop widths, against WCAG 2.2 Level AA rules, with reduced motion on and with JavaScript off. The demo is also tested keyboard-only. What hasn’t been tested yet is listed too." Link: "Read the accessibility statement" → `/accessibility/`
    3. **Nothing tracked.** "There is no sign-up, live AI request, analytics script, or marketing cookie. Notes you write in the demo stay in the page’s memory." Link: "See what stays in your browser" → `/mission/#privacy`
    4. **Status without spin.** "What works today, what’s being built, and what isn’t decided yet are listed in one place." Link: "See where things stand" → `/products/#where-things-stand`

### Home: one link

"How we build" adds `See how the work is checked` → `/about/#how-the-work-is-checked`, next to "Read our design commitments".

#Card 3's title was changed from "Nothing collected" to "Nothing tracked" in the final review. Emails and ordinary hosting logs do exist, so "collected" overclaimed. The body was already scoped to sign-up, AI requests, analytics and cookies.

## Wording rules

- No digits in the section, so there are no counts or version numbers that go stale.
- No claim about how often the tests run. Avoid "every change" and "continuous".
- Every factual sentence restates something already on the site:
  - the demo behavior (Where things stand, AddvancedFocus page);
  - the test scope (accessibility statement and its "Tested in" field);
  - the privacy facts (Home "How we build", Mission privacy note).

## Styling

The section uses `.section`, `.section-intro`, `.cards`, `.card` and `.text-link`; four cards trigger the existing two-column rule for four-card grids. One rule was added during implementation: `.card .text-link{display:flex;width:fit-content;margin-top:var(--space-3)}`, so a card's link always sits on its own line.

## Tests

- **About:** the section exists after the founder layout, has four cards, and each card has exactly one link. The links point to the four targets above.
- **Home:** "How we build" links to `/about/#how-the-work-is-checked`.
- **Section text** contains no digits.
- **Existing checks still pass:** the fragment-anchor test (all four targets resolve), the status-phrase placement test, the undecided-items test, the browser suite (`npm --prefix startup/qa test`) with no new known issues, and `csskit check`.

## Acceptance

1. All the tests above pass.
2. The copy matches this spec exactly.
3. It is reviewed at 375px and 1280px.
4. A PR is opened against `main` and not merged without the user's instruction.
