# Personal Website — yonibiro.com

Modern, fast, single-page portfolio with:
- Command palette (`Ctrl/⌘ K`)
- Theme toggle (light/dark)
- Scroll reveal + subtle motion (respects reduced-motion)
- Accessible, draggable 3D “Quality Cube”
- QA-flavored release-signal simulator with suite presets
- Project search/sort + one-click link copy
- Live GitHub pulse snapshot
- Flake cost estimator + random QA tips
- Live Los Angeles time

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

## Deploy
Build the production bundle with:

```bash
npm run build
```

The output in `dist/` includes the static portfolio, its share card, the Cloudflare worker entrypoint, and OpenAI Sites metadata.

## Quality checks
- Content and HTML checks: `npm run check`
- Production build: `npm run build`
- CI pipeline: `.github/workflows/quality.yml` (content checks, link checks, Lighthouse CI)
