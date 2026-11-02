# Atlas · Global Free TV Hub

A web-first, curated television discovery MVP. Search 50 broadcaster destinations across 27 countries and 11 languages, filter by country/language/category, save channels locally, and inspect source status. Responsive vanilla JavaScript with no framework build overhead. HLS.js is bundled for explicitly approved direct feeds; **32 entries offer an official YouTube player in the app; 18 retain official-site viewing**.

## Run

Requires Node 22+ and npm (or pnpm).

```sh
npm install --ignore-scripts
npm test
npm run build
npm run dev
```

Open http://127.0.0.1:4173. `dist/` is deployable to any static host. All asset paths are relative for GitHub project Pages.

## Publish on GitHub Pages

1. In repository Settings → Pages, choose **GitHub Actions** as the source.
2. In Actions, run **Deploy Atlas to GitHub Pages** manually.
3. Read the deployment URL from the completed run. Expected project address is `https://manxeon31.github.io/global-free-tv-hub/`, but it is not live until deployment succeeds.

CI validates pushes and pull requests. Deployment runs on pushes to main and can also be triggered manually. GitHub Pages serves static files; it cannot run the future API or enforce territorial access. The included preview server headers do not automatically apply to Pages.

## Curation

Edit `public/catalog.json` in a reviewed pull request. Maintain stable channel IDs. `page-verified` means the official page was inspected, not that playback, rights, or global access were verified. Entries that could not be inspected are labeled as candidates. In-app availability remains controlled by the broadcaster.

`npm run import` downloads fixed IPTV-org JSON endpoints and Free-TV's playlist to ignored `work/imports/`. It never visits stream URLs, changes the public catalog, or approves rights. Imports require network access and may fail offline. Do not commit raw upstream data until its license and intended use are reviewed.

Direct HLS needs `mode: "hls"`, `rights: "approved"`, an HTTPS `rightsEvidence`, a future `reviewExpiresAt`, `drm: "none"`, an HTTPS `streamUrl`, and `geo.status: "global"`. Restricted streams remain external in the static app because visitor territory is not established. Never place private rights documents or provider secrets in public JSON. Client policy prevents accidental activation; it is not a security boundary.

## Project map

- `public/`: accessible UI, catalog, policy, playback lifecycle, source disclosure.
- `scripts/`: static build, local preview, bounded discovery importer, M3U parser.
- `tests/`: policy denial cases, catalog invariants, filtering, playlist parsing.
- `docs/IMPLEMENTATION.md`: architecture, current source evidence, delivery plan, operations.
- `docs/schema.sql`: proposed production PostgreSQL model, not used by the static starter.
- `docs/openapi.yaml`: proposed API contract, not an implemented backend.

## Limits

No accounts, production database, EPG, source health dashboard, automated rights approval, geo service, media proxy, DRM support, or direct HLS broadcaster feed is shipped. Official YouTube embeds are available. These are phased work in the plan. Automated unit checks do not establish real-device playback compatibility. No fabricated live status or program schedule is displayed.

HLS.js is BSD-2-Clause; its license is copied to the built vendor directory. Broadcaster names remain their owners' marks; artwork uses text rather than copied logos. Project licensing must be chosen by the repository owner before external redistribution.

See [catalog expansion notes](docs/CATALOG-EXPANSION.md) for official embedded-stream references, provider controls, and review rules.

See [streaming-source review](docs/STREAM-SOURCES.md) for the review of every remaining station, coverage differences, short-lived program streams, and unresolved sources.
