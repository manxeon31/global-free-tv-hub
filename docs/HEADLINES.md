# Rolling headlines

Each channel card has a compact information strip. Where a configured publisher RSS feed succeeds, it shows one of the publisher's latest three items: a linked title, a short feed-supplied excerpt, publisher name, publication age, and item number. Items rotate every ten seconds. This is **published news**, not a verified description of what is airing on television. No AI program summaries, transcript scraping, images, or article bodies are generated or fetched.

The card uses channel information when no usable publisher feed exists. Never relabel that fallback as live. A feed with an old publication date is labeled Latest published. A failed refresh preserves cached items and labels them Last available headlines. Missing publication timestamps remain unknown. All headlines link to their original publisher.

## Update path

The GitHub Pages workflow fetches the fixed sources in `scripts/news-sources.json` on pushes, manual runs, and a cron schedule at minutes 7, 22, 37, and 52 of each hour. It generates `public/headlines.json` before building. Generated feed data is deployed, not committed back into the source branch. GitHub Actions cache retains last-good source results. If no source succeeds and no last-good items exist, deployment fails and preserves the previous site.

The browser polls the deployed snapshot every five minutes and when a hidden tab returns. Refresh fetches the latest deployed snapshot; it does not trigger a new provider crawl. The UI says roughly fifteen-minute updates because scheduled GitHub runs can be delayed. GitHub may disable scheduled workflows in an inactive public repository after its inactivity limit; operators must monitor the Actions schedule and deployment health. This is a practical scheduled-feed implementation for static hosting, not a seconds-level streaming news service. For stronger freshness guarantees, move the collector to a managed scheduled worker and expose a cached JSON endpoint.

No API keys or public CORS proxies are used. Feed fetches happen in GitHub Actions, avoiding browser CORS failures. Six concurrent jobs fetch only explicit HTTPS source URLs; redirects stay on source/publisher origins, DNS is checked for non-public addresses, responses are bounded to 2 MB, and timeouts are set. No user-supplied fetch URLs are accepted. XML DTD/entity declarations are rejected. RSS 2, RDF/RSS 1, and Atom items are normalized and deduplicated; snippets are plain text. Reader links are restricted to the publisher domains. Arbitrary feed support would require stronger egress controls and DNS pinning; this collector is scoped to a fixed reviewed list.

Pause headlines stops automatic item rotation. Reduced-motion users start paused. Hovered/focused cards retain their current item. Refreshing headlines updates the card strips without rebuilding the grid or interrupting the video player. Automatic changes are not announced by dozens of screen-reader live regions.

Source availability is tested at collection time. A configured URL is not represented as a working feed until it returns usable entries. Source discovery references include [Sky News RSS](https://news.sky.com/info/rss), [tagesschau feed information](https://www.tagesschau.de/infoservices/rssfeeds), publisher RSS responses, and official publisher domains. Publisher feeds can move or refuse automated access; these failures produce transparent fallback states. Review publisher terms and snippet reuse requirements before expanding or commercializing the service. Feed availability does not imply a license to copy full articles.

Tests cover RSS/Atom normalization, duplicate removal, HTML/script stripping, entity rejection, publisher-link validation, source staleness, unknown timestamps, and unsafe browser links.
