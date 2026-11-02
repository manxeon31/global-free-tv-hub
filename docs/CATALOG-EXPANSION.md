# Expanded catalog and in-app playback

Source review: November 1, 2026. Catalog v2 contains 50 entries across 27 countries and 11 displayed languages. Language variants and the NASA ISS feed are separate entries; this is not a count of 50 independent networks. Scheduled/video destinations are described as such. Origin country is not a distribution entitlement.

Nine initial embedded references were found in official broadcaster YouTube listings: France 24 English/French/Spanish, DW News, Al Jazeera English, TRT World, CNA, Euronews English, and NASA ISS. The catalog records each watch URL as source evidence. These use the provider's embedded player, not extracted CDN streams. Live IDs may end or change. The provider can disable embeds, require sign-in, limit territories, or display an intermission. A configured embed is not a promise of continuous availability.

Review evidence:

- [France 24 English](https://www.youtube.com/watch?v=HvZt-nh9sGg), [French](https://www.youtube.com/watch?v=a47ckXKZjxI), [Spanish](https://www.youtube.com/watch?v=zTv0hCakAhg)
- [DW News](https://www.youtube.com/watch?v=LuKwFajn37U), [Al Jazeera English](https://www.youtube.com/watch?v=gCNeDWCI0vo), [TRT World](https://www.youtube.com/watch?v=adUSssjOCLY)
- [CNA](https://www.youtube.com/watch?v=-PWMxjBgr0k), [Euronews](https://www.youtube.com/watch?v=pykpO5kQJ98), [NASA ISS](https://www.youtube.com/watch?v=M3HKLzjvKPc)
- [YouTube embedding instructions](https://support.google.com/youtube/answer/171780), [IFrame API and error events](https://developers.google.com/youtube/iframe_api_reference)

The player loads only after the visitor clicks Load in-app player. A disclosure explains the YouTube connection. Privacy-enhanced embeds retain provider controls, ads, and branding. The visitor presses Play inside the official video; Atlas does not force autoplay. Error handling covers disabled/private/ended streams, embed prohibition, missing referrer, and general browser/territory failures. Official-source links remain visible. Closing the dialog or leaving the page destroys the player; generation checks prevent late API callbacks mounting an old stream after closure. No accounts, cookies, keys, or regional controls are bypassed.

The YouTube mode is distinct from direct HLS approval. It records `provider-embed`, an exact official watch reference, a constrained video ID, and a review expiry. It does not assert a private broadcaster redistribution agreement or globally cleared media rights. Direct HLS retains its stronger approval gate. YouTube's terms and developer policies govern use of its player; private or premium content must not be worked around. External-only broadcasters retain `link-only`.

The Play here filter selects currently configured, non-expired in-app players. Source review status is distinct from playback test status. Pending entries remain labeled when automated access was blocked; no live status is fabricated. `sourceEvidence` records the official viewing destination for each of the 50 entries. Broadcaster-page checks are not end-to-end stream tests.

Pages deployment now runs automatically on pushes to main, as well as manually, and tests/build must succeed before deployment. Browser verification against the deployed origin is needed because YouTube requires a real referring website and provider responses can differ across clients and territories. The local preview CSP must allow YouTube frames and scripts; Pages does not use the preview server's headers.

Maintenance: review live IDs at least monthly and immediately after a playback failure report; disable failed embeds or update them only from official broadcaster listings. Expired entries fall back to external viewing without losing the directory entry. Do not silently replace an official stream with a third-party restream.

Live-source refresh: outdated indexed video IDs were replaced using the broadcaster channel’s current Live destination. NASA ISS was selected from the LIVE cards on NASA’s official Streams page. This validates current source identity; playback checks are recorded separately below.

Playback layout update: Watch here now opens an inline viewing section above the filters and loads the official player immediately. There is no modal overlay. The channel list remains usable while watching. Close player stops media, clears the iframe, and returns focus to the selected channel. The broadcaster still requires the visitor to press Play in its video controls.
