# Biro.dev — AI-powered assistive technology

This repository hosts **[Biro.dev](https://biro.dev/)**, a Los Angeles-based early-stage assistive-technology company developing accessible, affordable applications for neurodivergent people, people with disabilities, and families.

The flagship is **AddvancedFocus**, an executive-function support product in development. The website includes an interactive, scripted demonstration; this demo is **not a live AI app or a public mobile release**. Other product directions include CareBridge, StoryReady, ClearCue, PlainPath, StepAble, SayAble, SensoryScout, and OpenCall. **OpenCall has a separate native iOS development codebase**, although the accessible product direction on this site is still pre-release.

## What is currently deployed

Netlify builds and serves a **Python-generated static website** from `startup/dist/`. The older QA portfolio and Vite files may still exist elsewhere in this repository for history, but they are **not the current public site**. Refer to `netlify.toml` for the authoritative build instructions.

Source of truth:
- `startup/generate.py` — routes, page composition, SEO metadata, sitemap, and generated CSS.
- `startup/site_parts.py` and `startup/product_pages.py` — reusable sections and product pages.
- `startup/portfolio.json` — descriptions and plans for product concepts and prototypes.
- `startup/fragments/` — editorial content, AddvancedFocus demo markup and opt-in form.
- `startup/styles/` — stylesheets, assembled into `startup/dist/assets/site.css`.
- `startup/dist/assets/site.js` and `concept-model.js` — browser behavior and scripted demo data.
- `startup/dist/assets/brand/` and `startup/dist/assets/products/icons/` — deployed logo assets. The AddvancedFocus SVG icon is the artwork master.
- `startup/render_brand_art.py` — creates raster icons and updated illustrative concept artwork.

## Build locally

Requires Python 3 and packages listed in `startup/requirements.txt`.

```sh
cd startup
python3 -m pip install -r requirements.txt
python3 render_brand_art.py
python3 generate.py
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000/`. If you modify an editable source page or stylesheet, rerun `generate.py`. Avoid editing generated HTML or `dist/assets/site.css` directly. The current Netlify build performs all generation steps automatically.

## Early-access requests

The homepage includes an **optional, explicitly consented email form** handled by **Netlify Forms**, with a honeypot. It submits an email and product interest, not demo content. The `/thanks/` page confirms the browser submission flow. Form detection must be enabled in the Netlify project dashboard for the deployed form to receive submissions.

Review and manage signups in the project's **Forms** dashboard. This form does **not** automatically send a newsletter, guarantee beta access, or provide double opt-in. Configure notifications or an email-sending process separately if desired. Requests for removal/opt-out are handled through `founder@biro.dev`; see `/mission/#early-access-privacy`.

## Commitments and product status

The site distinguishes working scripted demo controls, native development work, exploratory product art, and unannounced product capabilities. Do not describe an internal build or proof of concept as a released app. The site's accessibility goal is **WCAG 2.2 AA**, not a certification; read `/accessibility/` for verified checks and outstanding testing.

Public pages: `/`, `/addvancedfocus/`, `/products/`, `/about/`, `/mission/`, `/accessibility/`, and `/contact/`.

This repo is the **marketing website**, not the authoritative source for the separately developed FocusFlow, OpenCall, or other native application code.
