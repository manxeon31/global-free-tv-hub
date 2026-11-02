> Current update: see [Catalog expansion](CATALOG-EXPANSION.md). The catalog now has 50 entries and official YouTube in-app playback. The original planning baseline below describes the six-entry starter; later-phase API/database work remains proposed.

# Global Free TV Hub: implementation and delivery plan

Prepared November 1, 2026. Product name in the starter: **Atlas**. Target: a curated, web-first discovery experience that progressively adds authorized browser playback. This document distinguishes the shipped static starter from the proposed production service.

## 1. Scope and definition of done

Start with 25–50 reviewed channels across at least 10 countries and 5 languages. These are launch targets, not current catalog counts. Prefer news, culture, public service, science, and fashion. Exclude adult content, premium/sports subscriptions, undocumented restreams, streams requiring copied cookies or fabricated headers, and rights-ambiguous direct playback. Count official-site destinations separately from embedded playable feeds. Never promise “all global TV.”

The starter ships six destinations, three page-verified and three candidate links. It implements search, country/language/category filters, browser-local favorites, source disclosure, a direct-HLS player path with a deny-by-default policy, import scaffolding, and GitHub Actions. There are no approved direct broadcaster feeds yet. A stream appearing in a playlist or responding to HTTP is not a rights clearance or successful viewing test.

Launch criteria: every published entry has provenance and review date; every direct feed has current permission and a successful browser/territory test; official fallback works; removal requests reach a monitored contact; keyboard/mobile flows pass; unavailable sources have honest messages. Broadcaster review is the critical path.

## 2. Verified discovery sources and official destinations

The following repository identities and documented endpoint names were checked during this work. Endpoint schemas and content can change; the local importer could not be exercised against the network in this environment. “Verified source” here does not mean every underlying channel is legal, live, or browser-compatible.

| Source | Current entry point | Intended use |
|---|---|---|
| IPTV-org IPTV | https://github.com/iptv-org/iptv | Community discovery; main documented playlist: https://iptv-org.github.io/iptv/index.m3u |
| IPTV-org API | https://github.com/iptv-org/api | JSON discovery, identities, feed/stream joins, blocklist checks |
| Free-TV IPTV | https://github.com/Free-TV/IPTV | Independent M3U discovery; inspected playlist: https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8 |

IPTV-org endpoints: `https://iptv-org.github.io/api/{channels,feeds,streams,logos,guides,categories,languages,countries,blocklist}.json`. Documentation currently distinguishes channels from feeds; language and broadcast-area information belongs to feed metadata. Join streams on channel/feed identifiers, not display names. Treat missing identifiers as manual matches. Guides are mappings, not a ready licensed EPG schedule. A feed's broadcast area is not proof of distribution rights in that area.

Source evidence: [IPTV-org README](https://raw.githubusercontent.com/iptv-org/iptv/master/README.md), [API schema documentation](https://raw.githubusercontent.com/iptv-org/api/master/README.md), [Free-TV README](https://raw.githubusercontent.com/Free-TV/IPTV/master/README.md). Review the license at a pinned upstream commit before copying data; a repository's code/data license does not license the television content or logos. Retain source URL, snapshot hash, commit where available, fetch time, and attribution requirements.

| Broadcaster | Official destination | Check result; initial treatment |
|---|---|---|
| FashionTV | https://www.fashiontv.com/ | Official page exposes live content; external viewing only. No embedded rights or stable HLS established. Do not confuse it with similarly named Fashion Television services. |
| NASA | https://www.nasa.gov/live/ | Official live page inspected; programming can be scheduled. Link externally. Old `/nasatv/` redirects here. |
| Al Jazeera English | https://www.aljazeera.com/video/live | Official live page inspected; link externally. `/live` redirects here. |
| France 24 | https://www.france24.com/en/live | Automated fetch denied; candidate link, manual verification required. |
| DW English | https://www.dw.com/en/live-tv/channel-english | Robots restriction; candidate link, manual verification required. |
| NHK WORLD-JAPAN | https://www3.nhk.or.jp/nhkworld/en/live/ | Automated access unsuccessful; candidate link, manual verification required. |

For each candidate, a curator opens the official page, confirms owner and intended audience, reviews terms, checks canonical URL, records country and language, and selects external/official embed/direct HLS. Ask the broadcaster for written permission when the intended use is not expressly authorized. Do not extract signed CDN URLs from developer tools and treat them as permanent feeds.

## 3. Architecture and component choices

**Phase 0 (shipped):** static HTML/CSS/ES modules → versioned `catalog.json` → official provider. HLS.js is bundled during build. Hosting: GitHub Pages. No media passes through Atlas servers. This keeps the first release cheap and deployable without credentials or a database.

**Production MVP:** browser → CDN/static web app → small Node/Fastify API → PostgreSQL; scheduled Node importer → staging records → curator review → published catalog. A separate constrained probe worker checks approved endpoints. Browser media requests go directly to the permitted provider CDN. Add a managed Redis queue only when database-backed jobs are insufficient. The UI can remain vanilla; migrate to React/TypeScript/Vite if state and staffing warrant it. Next.js is optional, not required for a channel directory.

Recommended open-source building blocks: HLS.js for MSE playback (BSD-2-Clause); native HTML video for Safari; Fastify for API; PostgreSQL with SQL migrations/Drizzle for storage; Zod or JSON Schema/Ajv for import/API validation; Playwright for browser flows; Vitest or Node test runner for pure logic. Verify versions and licenses at implementation time. The starter uses Node's built-in test runner and a custom build copy step to minimize dependencies. DASH/DRM with Shaka Player is a later licensed integration, not an MVP fallback. IPTV-org/epg can be evaluated for guide acquisition only after schedule rights and rate limits are cleared.

Architecture boundaries: curation and playback eligibility are separate from technical health. `healthy` must never mean `authorized`. Logs carry channel/provider IDs and error classes, not full signed URLs or tokens. Store user reports independently from authoritative health observations. Public APIs omit private evidence and admin fields.

## 4. Ingestion and editorial workflow

1. Fetch fixed approved source endpoints daily with timeout, response-size limits, ETag/Last-Modified support, backoff, and last-good snapshots. The starter importer already sets a 20-second timeout, a 25 MB limit per source, and disallows redirects; it does not yet implement conditional requests or retries.
2. Validate JSON shape and quarantine schema changes. Parse M3U robustly, including quoted attributes, CRLF/BOM, missing IDs, and comments. Preserve original values; ignore media-player-specific header directives. Reject non-HTTPS playback candidates and entries requiring cookies, origin/referrer spoofing, or credentials.
3. Normalize identities using stable upstream IDs and an alias table. Country identifies editorial origin; distribution territory is a separate field. Model multiple feeds per channel and multiple transport endpoints per feed. Do not merge language variants by name.
4. Match blocklists before publication. Preserve reasons and reviewer resolution. Diff each refresh against the prior snapshot. Upstream disappearance triggers review; a known rights complaint triggers immediate disablement. Do not replace a working approved stream automatically with a newly discovered URL.
5. Curator records official identity, content suitability, source evidence, permitted usage, territory, embedding conditions, logo/EPG permissions, and review expiry. Public approval references should be non-sensitive; store private contracts in restricted storage.
6. Probe only after review. Publish an immutable catalog version with validation checks; atomically update its pointer. Retain prior versions for rollback and purge a disabled feed from CDN caches promptly.

Future worker SSRF protections are essential: only reviewed exact HTTPS origins/paths; deny credentials, unusual ports, loopback/private/link-local/reserved IPv4 and IPv6; validate DNS and revalidate every redirect hop; enforce public-only outbound network policy against rebinding. Apply the same checks to master variants, segments, subtitle URLs, and key references. Cap nested playlist depth, requests, bytes, time, and concurrency. Disable XML external entities and cap XMLTV decompression size. The shipped discovery importer never probes candidate URLs, so it does not pretend to implement this probe security.

## 5. Data model

See `schema.sql` for proposed PostgreSQL tables. Channels own stable internal IDs, names and origin. Feeds carry language, official viewing URL, playback mode, geo policy, DRM classification, state and review expiry. Endpoints carry transport details and health, separate from rights. Source snapshots and candidate records retain provenance. Rights reviews are append-only decisions with reviewer and evidence. Programs are optional UTC EPG rows; do not infer a current show when no guide exists.

Add accounts/favorites only after demand: use opaque user IDs, unique `(user_id, channel_id)`, export/delete support, and short retention for security logs. Browser-local favorites ship without accounts. Geo signals should be transient and coarse; do not keep raw IPs for viewing analytics. A country selector is browsing preference, not authoritative eligibility.

## 6. Playback strategy

Resolve channel → approved feed → eligibility → ordered authorized endpoints. Prefer native HLS on Safari; otherwise HLS.js on MSE-capable browsers. HLS.js's official [support documentation](https://github.com/video-dev/hls.js) describes platform requirements. Check actual codecs, not just `.m3u8` suffixes. Start with AVC/H.264 + AAC for broad compatibility; unsupported codecs use the official destination. All manifests, variants, segments, subtitles, and authorized encryption-key requests need HTTPS and correct provider CORS for JavaScript playback. CORS on the master alone is insufficient.

Use explicit user playback, controls, inline playback, captions when provided, volume, and fullscreen. Native controls provide an initial baseline. Avoid autoplay assumptions and never strip provider ads. Destroy the HLS instance and clear the video source on channel change, dialog close, and navigation. Use bounded retries, visible progress/error state, and an official link always available. The starter provides basic controls and fatal-error fallback, but quality-selection UI, automatic endpoint failover, and telemetry remain future work.

A 403/451 may indicate access policy; it must not trigger a proxy/VPN workaround. A media error may indicate codec, network, CORS, or geo restrictions; show an honest combined message unless the provider gives a reliable cause. Distinguish startup failure from mid-session stall in telemetry. Never label a stream globally live based on a successful server HEAD request. Check GET manifest content, then a constrained segment sample where permitted; browser tests from launch territories are still required.

DRM, provider login, expiring credentials, or unknown encryption: external link in MVP. Ordinary HLS key encryption is not automatically DRM-free or permitted; keys require the same approval and access rules. Later DRM work requires a broadcaster agreement, official license service, EME-capable player, and contractual entitlement checks. Do not extract keys or circumvent restrictions.

## 7. Rights, territory, and operational safeguards

This is a product control design, not a jurisdiction-specific legal conclusion. Repository licenses do not establish media rights. Before public direct playback, obtain appropriate distribution/embedding permission and legal review for the operating and target jurisdictions. Keep a rights register, scope, expiry, territorial list, attribution/advertising requirements, and a named owner for each direct feed. Review broadcaster linking terms separately. Use text marks initially; logo reuse requires its own review.

Static policy checks reduce mistakes but cannot enforce entitlements because the JSON and stream URLs are public. Production resolution must fail closed when rights expire, DRM is unknown, country is unknown for restricted feeds, or a takedown applies. Obtain country from trusted platform metadata after stripping client-spoofable headers. Provider-side geo enforcement remains necessary; an API decision cannot stop someone sharing a static URL. Use provider-authorized short-lived URLs if supported, never homegrown bypasses. Do not publish restricted feed URLs in the static catalog.

Publish terms, privacy notice, source attribution, and a private rights contact before launch. On a credible complaint, disable the feed, invalidate catalog caches, retain a restricted audit trail, and review before reinstatement. Configure operator response targets, e.g. immediate disable switch and first review within one business day. Set launch policy on mature content; exclude flagged/unknown adult candidates by default. No visitor-submitted URLs in MVP.

## 8. Delivery phases and practical steps

| Phase | Indicative effort, one experienced developer | Deliverables and acceptance |
|---|---|---|
| 0: starter | Current repository | Static directory, six destinations, favorites, policy, source imports, tests, deployment workflow. Direct broadcaster playback remains unapproved. |
| 1: editorial launch | 1 week plus rights response time | 25–50 reviewed official destinations, pending links removed or verified, public policies/contact, mobile and accessibility QA, successful Pages deployment. |
| 2: playback pilot | 1–2 weeks plus permissions | 5–10 explicitly permitted HLS/official embeds, browser/territory matrix, source evidence, error metrics, disabled-feed drill. |
| 3: managed catalog | 2 weeks | PostgreSQL/API, authenticated curator UI, staging/diffs, audit, safe worker, scheduled snapshots and backups. |
| 4: expansion | 2+ weeks | 100–300 reviewed entries if staffing supports review, licensed EPG, reporting, optional accounts/PWA, measured performance improvements. |

These estimates assume provider cooperation; rights clearance has no guaranteed schedule. Avoid expanding ingestion faster than editorial review capacity.

Implementation order: run local tests/build; deploy directory; recruit curator; complete source checklist; pilot one approved globally available feed; test native/MSE lifecycle; add production schema/migrations; implement read API and authenticated admin separately; build staging importer; add safety-reviewed probing; instrument availability; then scale coverage. Do not build transcoding, timeshift, recording, casting, or a public media proxy into the first MVP.

## 9. API/contracts

`openapi.yaml` is a proposed contract, not live endpoints. `GET /v1/channels?q=&country=FR&language=eng&category=fashion&cursor=&limit=24` returns published summaries with an opaque next cursor and catalog version. Use ISO country codes and ISO 639-3 languages in the production model (the starter JSON uses display names). Validate limit 1–100 and cap query length. Stable ordering by `(sort_name,id)` prevents pagination gaps. Never expose pending entries through public search.

`POST /v1/playback/resolve` accepts `{channelId, preferredLanguage?}`; it must not trust a user-supplied country. Return `{mode:"external",url,reason,catalogVersion}` or `{mode:"hls",url,expiresAt,feedId,catalogVersion}`. Use `Cache-Control: private, no-store` for resolution. Restricted URLs require provider-backed entitlement and short expiry. Ineligible direct playback can return an official-site fallback with a reason, not a bypass URL.

Example:
```json
{"mode":"external","url":"https://www.fashiontv.com/","reason":"RIGHTS_REVIEW_REQUIRED","catalogVersion":"2026-11-01.1"}
```

Reports: `POST /v1/reports` with `{channelId,category:"broken"|"rights"|"metadata",message}` → 202 and opaque reference. Cap body, rate limit, validate origin, suppress spam, and send private rights material through a separate protected process. Admin changes require identity, editor role, CSRF protection where cookie-based, and immutable review logging. These endpoints are not implemented in the starter.

## 10. Testing and deployment

Shipped automated tests cover default-deny policy (missing permission, expiry, unknown geography, DRM, HTTP), unique catalog IDs, HTTPS destinations, combined filtering/favorites, and M3U parsing. Add production tests for schema drift, alias collisions, blocklist precedence, review expiry at exact boundary, revoked feeds, unknown country, SSRF IPv6/redirect/DNS cases, cursor validation, and report abuse.

Browser acceptance matrix: latest Chrome/Edge/Firefox on desktop, Safari macOS/iOS, Chrome Android. Verify search, combined filters, clear/no-result states, favorite persistence/storage failures, keyboard tab order, dialog Escape/focus restoration, screen-reader labels, 320 px and landscape layouts, reduced motion, provider link behavior, and no markup injection from imported names. For approved playback test native and MSE separately, CORS failures on child resources, invalid manifests, token expiry, 403/451, unsupported codec, stalled segments, channel switching/close cleanup, captions, and user gesture requirements. Use controlled local media fixtures for repeatability; provider smoke tests are separate, permitted, and geography-tagged. Never depend on public live streams for unit-test reliability.

GitHub Pages: Settings → Pages → GitHub Actions, then manually run the included deployment workflow. GitHub's [custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) explains the artifact/deployment model. Relative paths support the repository subpath. CI executes tests/build before publication. Prefer pinned action commit SHAs and a reviewed dependency lockfile before production. The starter pins the direct HLS.js version; dependency installation and browser playback must be verified by CI if unavailable locally.

For phase 3 use static CDN hosting plus a managed Node API and PostgreSQL in the chosen jurisdiction, secrets in the host's secret manager, migrations as a release step, health endpoint, origin-specific CORS, security headers, least-privilege DB roles, and staging/prod separation. Pages cannot enforce dynamic geo rules or serve the Node API. Its headers differ from the local preview server; choose a host supporting response headers when CSP/HSTS are required. A production CSP should allow only approved media/connect origins, with a controlled update process for CDN variants, rather than all HTTPS origins.

Release checklist: tests/build pass; source/rights review complete; inspect desktop/mobile; smoke official links from launch regions; record release/catalog SHA; deploy; check actual returned URL and loaded assets; validate rollback. Retain prior catalog and deployment; use the platform's previous version or revert the commit and redeploy. Purge revoked catalog entries separately from normal cache expiry.

Operations targets (initial goals): catalog request p95 under 300 ms at CDN, player startup p95 under 5 seconds for approved feeds under representative networks, playback failure rate under 5% per provider/territory, and catalog availability 99.5%. These are not measured starter results. Track failures by provider without collecting viewing histories by default. Alert on catalog/API failures, import staleness over 48 hours, probe failure streaks, expired rights, and report backlog. Avoid alerting on every transient segment failure. Keep daily database backups and practice restoration monthly once a database exists. Cost starts with static hosting and review labor; media egress stays with providers unless contracts explicitly authorize a relay. Do not introduce relaying without bandwidth budgets and agreements.
