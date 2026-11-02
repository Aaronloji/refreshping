# Chrome Web Store listing - RefreshPing

## Name
RefreshPing - Auto Refresh with Text Alerts

## Summary (max 132 chars)
Auto refresh any tab at your interval. Get alerted when a text appears or disappears. Pro is a one-time payment, no subscription.

## Category
Productivity (Tools)

## Description
RefreshPing reloads a tab for you and tells you when something changes.

Use it to watch a product until it is back in stock, a ticket page until seats open, an appointment page until a slot is free, or a dashboard that needs fresh data.

FREE
- Auto refresh any tab, from 1 second to hours
- Countdown on the icon, so you always know when the next reload happens
- Remembers your settings for each site
- Text alert: get a notification when a text appears or disappears on the page
- Refresh stops when the alert fires, so you do not lose what you saw

PRO ($9.99 once, no subscription)
- Text alerts on unlimited tabs at the same time
- Randomized interval (for example 60 seconds +/- 20%)
- Active hours: refresh only between the times you choose
- Sound alert

PRIVACY
- Your settings stay on your computer
- No analytics, no tracking, no ads
- Site access is requested only for the site you watch, only when you set a text alert

Questions or bugs: CONTACT_EMAIL

## Single purpose (dashboard field)
Reload a browser tab automatically at an interval chosen by the user and alert the user when a chosen text appears or disappears on that page.

## Permission justifications (dashboard fields)
- storage: Save the user's refresh settings per site and the Pro license status on the device.
- alarms: Keep the refresh timer running when Chrome suspends the background service worker.
- activeTab: Read the current tab's id and address when the user opens the popup, to start or stop refreshing that tab.
- scripting: Check whether the user's alert text is present on the watched page after each reload. Runs only on tabs where the user set a text alert.
- notifications: Show the alert when the watched text appears or disappears.
- offscreen: Play the optional alert sound (Pro), since a service worker cannot play audio.
- Host permission api.lemonsqueezy.com: Activate and validate the Pro license key with the payment provider. No other data is sent.
- Optional host permissions (http/https): Requested at runtime only for the single site where the user sets a text alert, to read that page's text locally.

## Remote code
No. All code is included in the package.

## Data usage disclosures
- Check "Authentication information" only (the Pro license key, sent to Lemon Squeezy to activate/validate). Conservative choice: the key leaves the device.
- Leave all other categories unchecked (no browsing history, no page content, no personal data leaves the device).
- Certify all three: not sold to third parties; not used for purposes unrelated to the single purpose; not used for creditworthiness or lending.

## Privacy policy URL
https://stackbitcr.com/refreshping/privacy  (upload store/privacy.html there)

## Assets
- Icon 128x128: icons/icon128.png
- Screenshots 1280x800: store/screenshot-1.png
