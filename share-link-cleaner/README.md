# Share Link Cleaner

Strips share and referral tracking parameters so a URL saved to Obsidian or a
bookmark comes out clean.

| Site | Parameter | Example |
| --- | --- | --- |
| Reddit (any subdomain) | `share_id`, `utm_*` | `…/using_the_same_hostnames_at_home_and_over/?share_id=NNO2d7e32tY1wsGdRyTzt` |
| Any site | `ref=selfh.st` (that value only) | `blog.cloudflare.com/cloudflare-certificate-authority/?ref=selfh.st` |

## Two Layers

The userscript runs after the page has been requested, so the server has
already seen the parameter by then. It fixes the address bar, and nothing more.

uBlock Origin's `removeparam` strips the parameter before Firefox sends the
request, so the server never sees it. Use both: uBO does the real work, and the
userscript catches anything uBO misses or a browser without uBO.

### uBlock Origin Filters

uBO dashboard ➔ My filters, paste, Apply changes:

```text
! Share Link Cleaner — keep in step with RULES in share-link-cleaner.user.js
||reddit.com^$removeparam=share_id
||reddit.com^$removeparam=/^utm_/
$removeparam=/^ref=selfh\.st$/
```

A `removeparam` regex is tested against `name=value`, which is how the last
line drops `ref=selfh.st` and leaves `ref=main` on GitHub alone.

## What Neither Can Stop

- The `selfh.st/r/…?m=…` click redirect. It is the newsletter's click tracking
  and is recorded the moment the email link is opened, before uBO sees the
  destination.
- The share itself. Reddit records it when the app creates the link on the
  phone; stripping only stops the desktop visit being tied back to it.

## Adding a Site

Add a rule to `RULES`, a line to the filters above, and cases to
`clean-url.test.mjs` (`node share-link-cleaner/clean-url.test.mjs`).
