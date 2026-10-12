# UserScripts

Custom user scripts for web annoyances.

## Scripts

| Script | Purpose | Install |
| --- | --- | --- |
| Gmail Middle Click → Background Tab | Middle-click a thread in the list, or a link inside an email, to open it in a background tab. | [Install](https://raw.githubusercontent.com/seanbuckley/tools-userscripts/master/gmail-middleclick/gmail-middleclick.user.js) |
| RedFlagDeals Affiliate Link Cleaner | Rewrite deal links and links in posts to point at the merchant directly, instead of through an affiliate redirector. | [Install](https://raw.githubusercontent.com/seanbuckley/tools-userscripts/master/redflagdeals-affiliate-cleaner/redflagdeals-affiliate-cleaner.user.js) |
| Share Link Cleaner | Strip share and referral tracking parameters (Reddit `share_id`, `?ref=selfh.st`, generic `?ref=sidebar`-style tags) from the address bar. Pair with the uBlock Origin filters in its [README](share-link-cleaner/README.md). | [Install](https://raw.githubusercontent.com/seanbuckley/tools-userscripts/master/share-link-cleaner/share-link-cleaner.user.js) |

While this repository is private the **Install** links above return 404 for
anyone not signed in — see [Private Repository](#private-repository-installing-via-personal-access-token)
below.

## Installation

### Public Repository

1. Install [Violentmonkey](https://violentmonkey.github.io/) (or another userscript
   manager, such as Tampermonkey) in your browser.
2. Click a script's **Install** link above. Your userscript manager will recognise
   the `.user.js` file and offer to install it.

### Private Repository (Installing via Personal Access Token)

If loading from a private GitHub repository:

1. Create a **Personal Access Token (PAT)** on GitHub:
   - Go to GitHub **Settings ➔ Developer Settings ➔ Personal Access Tokens**.
   - Create a token with **Contents: Read-only** permission for this repository.
2. Open **Violentmonkey Dashboard** in your browser.
3. Click the **`+`** button in the top right and choose **Install from URL**.
4. Enter the file URL with your token in front of the host:
   ```text
   https://YOUR_TOKEN@github.com/seanbuckley/tools-userscripts/raw/refs/heads/master/gmail-middleclick/gmail-middleclick.user.js
   ```
5. Click **Confirm Installation**.

The token goes before an `@` in the host position, not in a query string. A
`?token=...` parameter on a `raw.githubusercontent.com` URL is something GitHub
generates itself when you click **Raw**; it expires after about a week and will
not accept a PAT in its place.

> **Keep the token out of places it will spread.** Your userscript manager stores
> the install URL verbatim, so the token sits in plaintext in the extension's
> config and travels with any settings export or browser-sync backup. Scope it to
> `Contents: Read-only` on this repository alone, give it a short expiry, and
> revoke it if it is ever pasted somewhere it does not belong.

#### Auto-updating from a private repository

`@updateURL` and `@downloadURL` in each script point at the unauthenticated
public URL, which returns 404 while the repository is private — so update checks
fail, and most managers report nothing when they do.

To make updates work, edit your **installed** copy of the script (Violentmonkey
Dashboard ➔ the script ➔ **Edit**) and add your token to both lines:

```text
// @updateURL    https://YOUR_TOKEN@github.com/seanbuckley/tools-userscripts/raw/refs/heads/master/gmail-middleclick/gmail-middleclick.user.js
// @downloadURL  https://YOUR_TOKEN@github.com/seanbuckley/tools-userscripts/raw/refs/heads/master/gmail-middleclick/gmail-middleclick.user.js
```

The Personal Access Token can be regenerated (as per above) in the
[GitHub settings](https://github.com/settings/tokens).

Change these only in your local copy. A token committed to the repository is a
published credential, so the versions tracked here stay tokenless.

Tested with Violentmonkey and Tampermonkey. Other managers should work, but
background-tab placement may differ — the tab-position hints used by the Gmail
script are manager-specific.

### Before making this repository public

Everything above about tokens exists only because the repository is private.
Going public makes the **Install** links and `@updateURL` work as written, and
makes the whole PAT workflow unnecessary — but it also publishes the commit
history, so do these in the same change:

- [ ] **Revoke the PAT** used for private installs. Do this regardless of what
      the files say: it is in browser extension config, in settings exports, and
      possibly in sync backups.
- [ ] **Delete the "Private Repository" section above**, including this checklist.
- [ ] **Search the history, not just the working tree.** Deleting a line does not
      remove it from earlier commits, and `git log -p` is public once the repo is.
      `git log -p | grep -niE 'token|pat\b|secret|vault|password'` — anything that
      names where a credential lives needs history rewriting, not just a new commit.
- [ ] **Re-check the scripts** for anything account-specific added since.

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
