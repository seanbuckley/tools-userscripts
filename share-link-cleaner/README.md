# Share Link Cleaner

Strips share and referral tracking parameters so a URL saved to Obsidian or a
bookmark comes out clean.

| Site | Parameter | Example |
| --- | --- | --- |
| Reddit (any subdomain) | `share_id`, `utm_*` | `…/using_the_same_hostnames_at_home_and_over/?share_id=NNO2d7e32tY1wsGdRyTzt` |
| Any site | `ref=selfh.st` | `blog.cloudflare.com/cloudflare-certificate-authority/?ref=selfh.st` |
| Any site except code hosts | `ref=<hostname>` or `ref=<placement>` (`sidebar`, `footer`, `newsletter`, …) | `fglibs.com/?ref=sidebar`, `…/?ref=producthunt.com` |

Other `ref` values (`main`, `v1.2.3`, a SHA, a referral code) are left alone, and
GitHub, GitLab, Bitbucket, Codeberg and SourceHut keep every `ref` except
`selfh.st`, since there it names a branch.

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
$removeparam=/^ref=(([a-z0-9-]+\.)+[a-z][a-z]+|(sidebar|nav|navbar|menu|header|footer|home|homepage|banner|newsletter|email|rss|feed|share|social|twitter|facebook|linkedin|reddit|hn|hackernews|producthunt|blog|related|widget|cta)([-_][a-z0-9]+)*)$/
@@||github.com^$removeparam=/^ref=(([a-z0-9-]+\.)+[a-z][a-z]+|(sidebar|nav|navbar|menu|header|footer|home|homepage|banner|newsletter|email|rss|feed|share|social|twitter|facebook|linkedin|reddit|hn|hackernews|producthunt|blog|related|widget|cta)([-_][a-z0-9]+)*)$/
@@||gitlab.com^$removeparam=/^ref=(([a-z0-9-]+\.)+[a-z][a-z]+|(sidebar|nav|navbar|menu|header|footer|home|homepage|banner|newsletter|email|rss|feed|share|social|twitter|facebook|linkedin|reddit|hn|hackernews|producthunt|blog|related|widget|cta)([-_][a-z0-9]+)*)$/
@@||bitbucket.org^$removeparam=/^ref=(([a-z0-9-]+\.)+[a-z][a-z]+|(sidebar|nav|navbar|menu|header|footer|home|homepage|banner|newsletter|email|rss|feed|share|social|twitter|facebook|linkedin|reddit|hn|hackernews|producthunt|blog|related|widget|cta)([-_][a-z0-9]+)*)$/
@@||codeberg.org^$removeparam=/^ref=(([a-z0-9-]+\.)+[a-z][a-z]+|(sidebar|nav|navbar|menu|header|footer|home|homepage|banner|newsletter|email|rss|feed|share|social|twitter|facebook|linkedin|reddit|hn|hackernews|producthunt|blog|related|widget|cta)([-_][a-z0-9]+)*)$/
@@||sourcehut.org^$removeparam=/^ref=(([a-z0-9-]+\.)+[a-z][a-z]+|(sidebar|nav|navbar|menu|header|footer|home|homepage|banner|newsletter|email|rss|feed|share|social|twitter|facebook|linkedin|reddit|hn|hackernews|producthunt|blog|related|widget|cta)([-_][a-z0-9]+)*)$/
```

A `removeparam` regex is tested against `name=value`, which is how these lines
drop `ref=sidebar` and leave `ref=main` alone. The generic regex is a copy of
`REF_TRACKING` in the script. The `@@` exceptions must repeat it exactly, since
uBO only cancels a `removeparam` whose value matches; they leave the
`selfh.st` line working on code hosts.

## What Neither Can Stop

- The `selfh.st/r/…?m=…` click redirect. It is the newsletter's click tracking
  and is recorded the moment the email link is opened, before uBO sees the
  destination.
- The share itself. Reddit records it when the app creates the link on the
  phone; stripping only stops the desktop visit being tied back to it.

## Adding a Site

Add a rule to `RULES` (or a word to `REF_TRACKING`), the same change to the filters above, and cases to
`clean-url.test.mjs` (`node share-link-cleaner/clean-url.test.mjs`).
