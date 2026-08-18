# RedFlagDeals Affiliate Link Cleaner — Plan

Status: **plan only**, no script written yet.

Goal: on RedFlagDeals forum pages, rewrite deal links and links inside posts so
they point at the merchant directly, instead of at an affiliate redirector that
bounces through a tracking network first.

## What the pages actually contain

Findings from five saved thread pages (Shell, TD, Costco/Meyer, Best Buy,
Canadian Tire), August 2026. These are the shapes the script has to handle.

### 1. The marker RFD puts on its own rewrites

Every link RFD has rewritten carries `title="RedFlagDeals.com Affiliate Link"`,
on two element classes:

- `a.get-deal-button` — the main **Deal Link** button in the first post.
- `a.postlink.autolinker_link` — links inside post bodies and comments,
  `rel="nofollow noreferrer" target="_blank"`.

That title attribute is the single most reliable signal, but it is *not*
sufficient on its own (see case 4), and it is a site string that could change,
so it should be a hint that raises confidence, never the only trigger.

### 2. Skimlinks wrapper — `go.redirectingat.com`

```
http://go.redirectingat.com/?id=130832X1694315&xs=1&url=https%3A%2F%2Fwww.canadiantire.ca%2Fen%2Fpdp%2F…%3Floc%3Ddf
```

The destination is percent-encoded in the `url` parameter. Single
`decodeURIComponent` gets the clean URL back. Also appears as
`go.redirectingat.com?id=…` (no slash before `?`) — parsing must not depend on
the path. Same family: `go.skimresources.com`.

### 3. Impact Radius wrapper — `bestbuyca.o93x.net`

```
https://bestbuyca.o93x.net/c/341376/644465/10221?u=https://www.bestbuy.ca/en-ca/product/…/16374006?source=collection&adSlot=2&slotPos=2&pageKey=collection&subId1=f2823256
```

The destination in `u=` is **not** encoded. Its own query string (`?source=…`)
runs on into the wrapper's query string, so `URLSearchParams.get('u')` returns
only `https://www.bestbuy.ca/…/16374006?source=collection` and silently drops
the rest — and the trailing `subId1=f2823256` is the affiliate's, not the
merchant's. The parser has to take the raw substring after `u=` and then decide
which trailing params belong to the destination.

Note both sample Best Buy links share `subId1=f2823256`, which is the RFD thread
id (`…-2823256`) — the affiliate is tagging the referring thread.

Same network, other hostnames: `*.sjv.io`, `*.pxf.io`, `*.7eer.net`,
`*.o93x.net`, `prf.hn` (which uses a `destination:` path segment rather than a
query param).

### 4. No wrapper — affiliate params on the merchant's own URL

```
https://www.canadiantire.ca/?utm_medium=Affiliate&utm_campaign=Hot_Online_Deals&CJEVENT=6bbb38c36a9311e981df00010a24060b&utm_source=RedFlagDeals.com
```

No redirector host, no `title` marker on this one. Cleaning means stripping
parameters, not unwrapping. Also in this bucket: `tag=redflagdealsc-20` appended
to an Amazon URL *inside* a Skimlinks payload — so param stripping must run on
the result of unwrapping, not only on top-level links.

### 5. Out of scope — site chrome

`https://redflagdeals.cheapoair.ca/?FpAffiliate=CJ&FPSub=…` sits in the nav bar
(`a.main_nav_item_btn`) on every page. That is RFD's own travel portal, not a
deal link someone posted. The script must be scoped to post/deal content and
leave navigation, ads and sidebars alone.

### 6. Free verification signal

For post links, the anchor's **text** is usually the clean URL already:

```html
<a href="http://go.redirectingat.com?id=…&url=https%3A%2F%2Fmeyercanada.ca%2F…">https://meyerc…</a>
```

(often truncated with an ellipsis for display). Where the text parses as a URL
and its host matches the host we unwrapped, that is independent confirmation the
unwrap was right. Useful as a sanity check; not a source, since it is truncated.

The page's JSON-LD `sharedContent.url` also carries the deal link, but in its
wrapped form — no help.

## Design

### Structure

New directory `redflagdeals-affiliate-cleaner/` with
`redflagdeals-affiliate-cleaner.user.js`, copied from `template/template.user.js`
per the repo's layout rule. Metadata block: `@match
https://forums.redflagdeals.com/*` plus `https://www.redflagdeals.com/*` for the
front-page deal listings, `@grant none`, `@noframes`,
`@run-at document-idle` (posts are server-rendered, and unlike the Gmail script
there is no native behaviour to beat to the punch), `@updateURL`/`@downloadURL`
pointing at the script's own raw URL.

### Cleaning pipeline

A pure function `cleanUrl(href) -> string | null` (null = leave it alone),
composed of two stages applied in a loop until the URL stops changing, capped at
~5 iterations so a pathological nesting cannot spin:

1. **Unwrap.** Match the host against a table of known redirectors, each entry
   naming where the destination lives and how it is encoded:
   - `go.redirectingat.com`, `go.skimresources.com` → `url`, percent-encoded
   - Impact hosts (`*.o93x.net`, `*.sjv.io`, `*.pxf.io`, `*.7eer.net`) → `u`, raw
   - CJ (`anrdoezrs.net`, `dpbolvw.net`, `kqzyfj.com`, `tkqlhce.com`,
     `jdoqocy.com`) → trailing URL in the path, percent-encoded
   - `click.linksynergy.com` → `murl` / `RD_PARM1`
   - `shareasale.com` → `urllink`
   - `awin1.com` → `ued` / `p`
   - `prf.hn` → `destination:` path segment
   - `redirect.viglink.com` → `u`
2. **Strip params.** Remove known affiliate/tracking params from whatever
   survives: `tag` (Amazon only — it is a legitimate param elsewhere), `CJEVENT`,
   `subId1`/`subid`, `irclickid`, `ranMID`/`ranEAID`/`ranSiteID`, `siteID`,
   `affid`/`AffiliateID`, `utm_*` **only when** `utm_source`/`utm_medium` names
   RFD or "affiliate", `sourceId`, `sharedid`, `clickref`, `partner`.

The raw-`u=` case (3 above) gets its own extraction: substring from `u=` to the
end, then walk the trailing `&k=v` pairs and drop those in the affiliate-param
list, keeping the rest as part of the destination.

**Bias toward leaving things alone.** Refuse to rewrite when the result is not
`http(s)`, has no host, still points at a known redirector after the iteration
cap, or when stripping would leave a bare origin where a product page was
(the Canadian Tire example is *already* a bare origin, so that check is on
"did we make it worse", not "is it short").

### DOM handling

- Scope: `a[href]` inside post/deal containers only. Confirm the actual
  container selectors against a live page — the saved pages show `.post_content`
  / `.get-deal-button` but the surrounding structure is worth checking before
  hard-coding, and the front page uses a different layout from a thread.
- Rewrite `href` in place. Keep the link's text, classes and `target`; drop
  `rel="nofollow noreferrer"`? No — leave `rel` alone, it costs nothing and
  removing `noreferrer` would start leaking the referrer.
- Mark handled links with `data-rfd-cleaned="1"` so re-runs are cheap and the
  change is visible in devtools.
- **Visible signal.** Retitle the link (`title="Cleaned: <host>"`) and add a
  small marker via injected CSS on `[data-rfd-cleaned]` so it is obvious the
  script fired — without that, a silent failure is indistinguishable from a page
  with no affiliate links.
- **Dynamic content.** RFD paginates server-side, but quotes/previews and
  "load more" behaviour need checking. A `MutationObserver` on the thread
  container, debounced, re-running the scan over added subtrees.
- No `onclick`/`data-*` interception needed: the samples show plain `href`
  navigation, no JS-driven click handler on these links. Worth re-verifying live.

### Config

A `const CONFIG` block at the top of the file: the redirector table, the param
list, `dryRun` (log what would change, change nothing) and `debug` (console
tracing). No GM storage, no options UI — this repo's scripts are edited in place.

## Risks / open questions

- **Rewriting the wrong link.** The worst outcome is a link that no longer
  reaches the deal. Mitigated by the conservative refusals above and by the
  anchor-text cross-check where available.
- **Merchant URLs that need their params.** Some destinations genuinely need
  `utm_*` (rare) or a param that looks like tracking. Strip list stays narrow and
  documented; `dryRun` exists for testing before trusting it.
- **RFD may change the marker or wrapper.** The script must degrade to "does
  nothing" rather than "mangles links" when the shapes do not match.
- **Does RFD gate anything on the click?** Some sites redirect via a click
  handler or a server-side `/out?` endpoint; none seen in the five samples, but
  worth confirming on a live page before finalising.
- **More samples wanted** for: an Amazon deal-link button (not just an Amazon URL
  inside a Skimlinks payload), a `click.linksynergy.com` or CJ link in the wild
  on RFD, and the front-page (`www.redflagdeals.com`) listing layout.

## Steps

1. Copy `template/template.user.js` into
   `redflagdeals-affiliate-cleaner/redflagdeals-affiliate-cleaner.user.js`, fill
   in metadata.
2. Implement `cleanUrl` + the redirector/param tables. Pure, no DOM.
3. Verify against the five saved pages before touching the DOM layer: every
   wrapped link in them should produce the expected clean URL, and the nav
   cheapoair link should be left untouched.
4. DOM layer: scoped scan, in-place rewrite, `data-rfd-cleaned` marker, CSS hint.
5. `MutationObserver` for late content.
6. Test on live threads with `dryRun` first; then confirm each cleaned link
   still lands on the right product page.
7. `node --check` (what CI runs), add the row to the README table, add a
   CHANGELOG section under a new `## redflagdeals-affiliate-cleaner` heading.
