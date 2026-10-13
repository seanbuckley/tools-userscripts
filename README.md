# UserScripts

Custom user scripts for web annoyances.

## Scripts

| Script | Purpose | Install |
| --- | --- | --- |
| Gmail Middle Click → Background Tab | Middle-click a thread in the list, or a link inside an email, to open it in a background tab. | [Install](https://raw.githubusercontent.com/seanbuckley/tools-userscripts/main/gmail-middleclick/gmail-middleclick.user.js) |
| RedFlagDeals Affiliate Link Cleaner | Rewrite deal links and links in posts to point at the merchant directly, instead of through an affiliate redirector. | [Install](https://raw.githubusercontent.com/seanbuckley/tools-userscripts/main/redflagdeals-affiliate-cleaner/redflagdeals-affiliate-cleaner.user.js) |
| Share Link Cleaner | Strip share and referral tracking parameters (Reddit `share_id`, `?ref=selfh.st`, generic `?ref=sidebar`-style tags) from the address bar. Pair with the uBlock Origin filters in its [README](share-link-cleaner/README.md). | [Install](https://raw.githubusercontent.com/seanbuckley/tools-userscripts/main/share-link-cleaner/share-link-cleaner.user.js) |

## Installation

1. Install [Violentmonkey](https://violentmonkey.github.io/) (or another userscript
   manager, such as Tampermonkey) in your browser.
2. Click a script's **Install** link above. Your userscript manager will recognise
   the `.user.js` file and offer to install it.

Each script's `@updateURL` points at its Raw URL on `main`, so your manager
picks up new versions on its normal update check.

Tested with Violentmonkey and Tampermonkey. Other managers should work, but
background-tab placement may differ — the tab-position hints used by the Gmail
script are manager-specific.

## Layout

One directory per script, named after the script. Each script file is named
`<name>.user.js` — the `.user.js` suffix is what lets a userscript manager
intercept the Raw URL and install it.

[`template/template.user.js`](template/template.user.js) is a starting point for
new scripts: copy it into a new directory, rename it, and fill in the metadata
block (including `@updateURL` and `@downloadURL`, which point at the script's own
Raw URL once its path is known).

A script may sit alongside a `*.test.mjs` file covering its pure logic — run it
with `node <path>`. `redflagdeals-affiliate-cleaner/clean-url.test.mjs` is the
expected-results table for that script's URL parsing, built from saved pages;
extend it when adding an affiliate network.

CI runs `node --check` against every `*.user.js` file on push and pull request.
It does not run the `*.test.mjs` files.

## Licence

[MIT](LICENSE)
