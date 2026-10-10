# Biro.dev slim brand assets

The website uses the founder-supplied slim Biro.dev identity, provided October 10, 2026.

- Header and footer: `startup/dist/assets/brand/biro-horizontal-dark.svg`.
- Print alternative: `startup/dist/assets/brand/biro-horizontal-mono-light.svg`.
- Browser favicon: `startup/dist/assets/brand/biro-favicon.svg`.
- Organization structured data references the same dark horizontal wordmark.
- The other supplied SVG variants are retained in `startup/dist/assets/brand/`.

These are the supplied SVG paths and gradients, with no geometry changes. Preserve the aspect ratio and clear space; use the light/monochrome variants on suitable backgrounds. Do not stretch the symbol, recolor it through a CSS filter, or substitute the former text-only mark.

The shared brand link is defined as `BRAND_LINK` in `startup/generate.py`. Sizing is in `startup/styles/components/header.css`. Rebuild with `python3 generate.py`; `startup/dist/assets/site.css` is generated and should not be edited directly.

The full original logo ZIP and individual PNG/ICO exports were supplied separately with the project handoff. This source change installs the SVG web identity. Apple-touch PNGs and ICO exports have not been installed in production; the supplied SVG favicon is used. The general JPEG social cards remain unchanged.

This identity belongs to the Biro.dev company website. Product-app icons and interface mockups remain separate concept artwork and should not be replaced by the corporate mark.
