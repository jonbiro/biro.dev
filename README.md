# Yoni Biro — QA Automation Portfolio

An evidence-led, progressively enhanced portfolio for a QA Automation Engineer / SDET.

## Highlights

- Recruiter-friendly 60-second brief and project evidence sheets
- Verified Super Seerr case study: 36/36 passing at commit `49fca11`, seven external adapters plus the Seerr overlay, and Chrome/Firefox builds
- Expandable architecture map with real source paths, engineering tradeoffs, and next-step thinking
- Searchable and sortable project library with useful no-JavaScript fallbacks
- Site quality dossier covering accessibility, performance, SEO, runtime, links, and dependencies
- Interactive QA challenge, release-signal simulator, and flake-cost calculator
- Command palette (`Ctrl/⌘ K`)
- Theme toggle (light/dark)
- Scroll reveal and subtle motion that respect reduced-motion preferences
- Accessible, draggable 3D “Quality Cube”
- On-demand live GitHub pulse snapshot
- Live Los Angeles time

The QA Lab is an explicit simulation: it models test-suite tradeoffs without presenting generated outcomes as real CI results.

## Edit your info

Update your content in `assets/content.js`.

Common fields:
- Name/title/location/email
- Social links (GitHub/LinkedIn/etc.)
- Principles + projects
- Resume URL (`person.resumeUrl`)

## Run locally

Install the project once, then start the local preview:

```bash
npm install
npm run dev
```

Vite prints the local address when it starts.

## Deploy to Netlify

Build the production bundle with:

```bash
npm run build
```

Netlify builds from the `main` branch using `netlify.toml` and publishes the static bundle in `dist/client/`.

The production site is [biro.dev](https://biro.dev/).

## Quality checks

- Content, static-fallback parity, local asset, manifest, and HTML checks: `npm run check`
- Production build: `npm run build`
- Chromium interaction, keyboard, responsive, no-JavaScript, and axe checks: `npm run test:e2e`
- Full local gate: `npm test`
- CI pipeline: `.github/workflows/quality.yml` (dependency audit, links, browser tests, failure evidence, and Lighthouse CI)
