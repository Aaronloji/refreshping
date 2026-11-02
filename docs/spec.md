# RefreshPing - spec v1 (2 Nov 2026)

## Evidence (competitor complaints)

Chrome Web Store reviews cannot be read by automation; sources below are Firefox Add-ons, Edge Add-ons and third-party reports.

| # | Complaint | Competitor | Evidence |
|---|-----------|-----------|----------|
| 1 | Most features locked behind a paywall | Easy Auto Refresh (1M users, 3.1 stars on CWS) | Firefox, 1 star, Lrowland (~2024): "Almost no functionality unless you pay". Firefox, 1 star, user 17790075 (~2023): "Most of the features locked behind a paywall." |
| 2 | Annual fee instead of a one-time price | Easy Auto Refresh | Edge, Myers, 9 Mar 2023: paid options "should be a 1-time cost", no reason for a "$30 annual fee". |
| 3 | Countdown hard to see | Easy Auto Refresh | Edge, Cleverson, 17 Jul 2024: counter only visible in the last 9 seconds before refresh. |
| 4 | Does not work after install | Easy Auto Refresh | Firefox, 1 star, Tropper (~Jun 2026): installs but nothing works. |
| 5 | Privacy / trust | Auto Refresh Plus (100K+ users) | ExtScope: sends usage analytics including page URLs to autorefreshplus.in; host access to all sites. CyberInsider, Jun 2024: users reported redirects to spam sites. |

Sample is small (6 reviews + 2 reports). Easy Auto Refresh has ~2,000 ratings on CWS that could not be read.

## Product decisions

| Decision | Answers complaint |
|----------|------------------|
| Pro is $9.99 once, no subscription | 2 |
| Free version is useful on its own: refresh, countdown, per-site memory AND text alert on 1 tab (Easy Auto Refresh charges for text alerts) | 1 |
| Countdown always visible on the icon (seconds, then m/h) | 3 |
| Tested on real sites before release; clear message when a page cannot be read | 4 |
| No analytics, no tracking; site access requested only for the watched site | 5 |

## Free vs Pro

Free: auto refresh any tab, countdown on icon, settings per site, text alert (appears/disappears) on 1 tab, notification, refresh stops on alert.

Pro ($9.99 once): text alerts on unlimited tabs, random interval (+/- %), active hours, alert sound.

## Out of scope for v1
Auto-click elements, reload all tabs, URL rotation, clear cache (Easy Auto Refresh Pro has these; add only if buyers ask).
