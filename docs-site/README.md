# Nexus Suite Docs Site

Built with [Astro Starlight](https://starlight.astro.build/). Source content lives in `src/content/docs/`.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build   # outputs to dist/
npm run preview
```

## Deploy

Deployed automatically to GitHub Pages by `.github/workflows/docs.yml` on every push to `main` that touches `docs-site/**`.
