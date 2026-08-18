# RedFlagDeals Affiliate Link Cleaner — Plan

Status: **plan only**, no script written yet.

Goal: on RedFlagDeals pages, rewrite deal links and links inside posts so they
point at the merchant directly, instead of bouncing through an affiliate
tracking network first.

Based on ten saved pages from August 2026: five thread pages (Shell, TD,
Costco/Meyer, Best Buy, Canadian Tire), three more threads (London Drugs,
Walmart, Amazon), the Hot Deals forum listing, and the `www.redflagdeals.com`
front page.

## What the pages actually contain

### Page types

| Page | Affiliate links present | Notes |
| --- | --- | --- |
| `forums.redflagdeals.com/<thread>/` | Deal button + in-post links | The main case |
| `forums.redflagdeals.com/hot-deals-f9/` (listing) | **None** | Thread links only — script should do nothing here |
| `www.redflagdeals.com/` (front page) | Deal tiles | Different markup, no marker attribute, shares markup with ads |

### The marker RFD puts on its own rewrites

On forum pages, rewritten links carry `title="RedFlagDeals.com Affiliate Link"`:

- `a.get-deal-button` — the **Get Deal** button, inside `.thread_header_buttons`.
- `a.postlink.autolinker_link` — links in post bodies and comments,
  `rel="nofollow noreferrer" target="_blank"`.

The marker is a useful hint but is **neither necessary nor sufficient**:

- The London Drugs thread has `a.get-deal-button` with a clean
  `londondrugs.com/search?q=BUDDYCARE…` URL and **no** marker — nothing to do.
- The Canadian Tire in-page link carrying `CJEVENT` has **no** marker either, yet
  does need cleaning.
- Front-page deal tiles have no marker at all.

So detection must be driven by the URL, with the marker only raising confidence.

### Wrapper shapes, all confirmed in samples

**1. Skimlinks — `go.redirectingat.com`** (also `go.skimresources.com`)

```
http://go.redirectingat.com/?id=130832X1694315&xs=1&url=https%3A%2F%2Fwww.yeti.ca%2Fcustomize
```

Destination percent-encoded in `url`. Also appears as `go.redirectingat.com?id=…`
with no slash before `?`, so parsing must not depend on the path.

**2. Impact Radius — `bestbuyca.o93x.net`, `lenovo.evyy.net`**

The destination is in `u`, and **the encoding varies between the two samples**:

```
https://bestbuyca.o93x.net/c/341376/644465/10221?u=https://www.bestbuy.ca/en-ca/product/…/16374006?source=collection&adSlot=2&slotPos=2&pageKey=collection&subId1=f2823256
http://lenovo.evyy.net/c/341376/225728/3899?u=https%3A%2F%2Fwww.lenovo.com%2Fca%2Fen%2Fp%2F…%2Fgy51c21211
```

The Lenovo one is percent-encoded; the Best Buy one is raw. **This is the single
most error-prone case.** For the raw form, the destination's own query string
(`?source=collection&…`) runs on into the wrapper's, so
`URLSearchParams.get('u')` returns a truncated URL — silently dropping most of
it and keeping the affiliate's trailing `subId1`.

Handling: sniff the raw value after `u=`. If it starts with `http%3A`/`https%3A`,
decode it. If it starts with `http://`/`https://`, take the substring to the end
of the query string and then walk the trailing `&k=v` pairs, dropping known
affiliate params and keeping the rest as the destination's own.

Both hosts use publisher id `341376` — that is RFD's Impact account, and a
reasonable extra confidence signal. Related hostnames on this network:
`*.sjv.io`, `*.pxf.io`, `*.7eer.net`, `prf.hn` (uses a `destination:` path
segment rather than a query param).

**3. Rakuten / LinkSynergy — `click.linksynergy.com`**

```
http://click.linksynergy.com/deeplink?id=CAqD7bLWUPI&mid=36751&murl=https%3A%2F%2Fwww.walmart.ca%2Fip%2F6000208859099&u1=rfdcb
```

Destination percent-encoded in `murl`. `u1=rfdcb` is RFD's sub-id. Seen on both
the Walmart thread and front-page tiles (LEGO, Zwilling).

**4. AvantLink — `www.avantlink.com/click.php`**

```
https://www.avantlink.com/click.php?tt=ml&ti=863485&pw=144787&url=https%3A%2F%2Fwww.mec.ca%2Fen%2Fproducts%2Fdeals
```

Destination percent-encoded in `url`.

**5. No wrapper — affiliate params on the merchant's own URL**

```
https://www.amazon.ca/dp/B08LDN5451?th=1&tag=redflagdealsc-20          (Amazon thread, Get Deal button)
https://www.canadiantire.ca/?utm_medium=Affiliate&utm_campaign=Hot_Online_Deals&CJEVENT=…&utm_source=RedFlagDeals.com
```

Cleaning means stripping params, not unwrapping. The Amazon case is the clean
example of what "cleaned" should look like: drop `tag`, **keep `th=1`** (a real
Amazon variant selector). Also in this bucket: `tag=redflagdealsc-20` appended to
an Amazon URL *inside* a Skimlinks payload — so stripping has to run on the
result of unwrapping, not only on top-level hrefs.

### The front page needs URL-based scoping, not container scoping

Front-page deal tiles are `a.panel` / `a.panel.panel-N` with a
`data-deal-long-title` attribute, inside
`div.component[data-component-type=images]`.

**The "Sponsors" row uses the identical markup** — `a.panel`, same component
type, differing only in `data-component-layout` (`grid/circle` vs `grid/tile`)
and an `<h2>Sponsors</h2>` headline — and its links are doubleclick ad trackers:

```
https://ad.doubleclick.net/ddm/trackclk/N307601.2181304VERTICALSCOPE/B34323703.432094375;dc_trk_aid=…
```

Rewriting a paid placement would be worse than leaving an affiliate link alone.
Since no container selector separates the two reliably, the front page must be
scoped **by URL**: rewrite only when the host is in the known-redirector table,
and keep an explicit denylist of ad hosts (`*.doubleclick.net`,
`pubads.g.doubleclick.net`) as a second line of defence.

`data-deal-long-title` is not trustworthy as a data source — on the LEGO tile its
value is literally `https://www.thereformation.com/sale`, i.e. the wrong URL.

Clean front-page tiles exist too (two `shop.lululemon.com` product links with no
wrapper), so "is a tile" says nothing about "needs cleaning".

### Free verification signals

- **In-post links:** the anchor text is usually the clean URL already —
  `<a href="…linksynergy…murl=…walmart.ca%2Fip%2F6000208859099">https://www.walmart.ca/ip/6000208859099</a>`.
- **Deal button:** carries `<span class="deal_info_url_display">` with the clean
  URL.

Both are **truncated with an ellipsis when long** (the Amazon one is exact at
`https://www.amazon.ca/dp/B08LDN5451?th=1`; the Canadian Tire and London Drugs
ones are cut off). So they are a **prefix cross-check** — confirm the host and as
much of the path as is present — never a source.

The page's JSON-LD `sharedContent.url` carries the deal link in its wrapped form,
so it is no help.

## Design

### Structure

New directory `redflagdeals-affiliate-cleaner/` with
`redflagdeals-affiliate-cleaner.user.js`, copied from `template/template.user.js`
per the repo's layout rule. Metadata: `@match https://forums.redflagdeals.com/*`
and `https://www.redflagdeals.com/*`, `@grant none`, `@noframes`,
`@run-at document-idle` (content is server-rendered and there is no native
behaviour to beat to the punch), `@updateURL`/`@downloadURL` at the script's own
raw URL.

### Cleaning pipeline

A pure `cleanUrl(href) -> string | null` (null = leave it alone), two stages
looped until the URL stops changing, capped at ~5 iterations:

1. **Unwrap.** Match host against a table of redirectors, each entry naming
   where the destination lives and how it is encoded:
   - `go.redirectingat.com`, `go.skimresources.com` → `url`, encoded
   - Impact (`*.o93x.net`, `*.evyy.net`, `*.sjv.io`, `*.pxf.io`, `*.7eer.net`)
     → `u`, **encoding sniffed per-link** (see above)
   - `click.linksynergy.com` → `murl` (also `RD_PARM1`)
   - `www.avantlink.com` → `url`
   - CJ (`anrdoezrs.net`, `dpbolvw.net`, `kqzyfj.com`, `tkqlhce.com`,
     `jdoqocy.com`) → trailing URL in the path, encoded
   - `shareasale.com` → `urllink`; `awin1.com` → `ued`/`p`;
     `prf.hn` → `destination:` path segment; `redirect.viglink.com` → `u`
   (The CJ, ShareASale, AWIN, prf.hn and viglink entries are not in any sample —
   they are the same networks' standard formats, included speculatively and
   marked as such in the code.)
2. **Strip params** from whatever survives: `tag` (**Amazon hosts only** — a
   legitimate param elsewhere), `CJEVENT`, `subId1`/`subid`, `u1`, `irclickid`,
   `ranMID`/`ranEAID`/`ranSiteID`, `siteID`, `affid`/`AffiliateID`, `sharedid`,
   `clickref`, `partner`, and `utm_*` **only when** `utm_source`/`utm_medium`
   names RFD or "affiliate".

**Bias toward leaving things alone.** Refuse when the result is not `http(s)`,
has no host, still points at a known redirector after the cap, or when the host
is on the ad denylist. Refuse when a rewrite would reduce a product URL to a bare
origin (note the Canadian Tire sample *is* already a bare origin, so this check
is "did we make it worse", not "is the result short").

### DOM handling

- **Selectors** (confirmed against the samples):
  - posts: `div.post_content div.content a[href]` (inside `section.post_body`)
  - deal button: `a.get-deal-button`
  - front page: `a.panel[href]`, gated by URL as described above
- Rewrite `href` in place; keep text, classes and `target`. Leave `rel` alone —
  removing `noreferrer` would start leaking the referrer.
- Where a cross-check string is available (anchor text, `deal_info_url_display`),
  compare host + path prefix and **skip the rewrite on mismatch**, logging it.
- Mark handled links `data-rfd-cleaned="1"` so re-runs are cheap and the change
  is visible in devtools.
- **Visible signal:** retitle (`title="Cleaned: <host>"`) plus a small CSS marker
  on `[data-rfd-cleaned]`, so a silent failure is distinguishable from a page
  that simply has no affiliate links.
- **Dynamic content:** debounced `MutationObserver` over added subtrees. RFD
  paginates server-side, but quote previews and the front page's sliders warrant
  it.
- No click-handler interception needed — all ten samples use plain `href`
  navigation on these links. Worth re-verifying live.

### Config

A `CONFIG` block at the top: redirector table, param list, ad denylist,
`dryRun` (log, change nothing) and `debug`. No GM storage, no options UI.

## Risks / open questions

- **Rewriting a paid placement.** The front page's sponsor ads look exactly like
  deal tiles. Addressed by URL-based scoping plus the ad denylist.
- **The raw-vs-encoded `u=` split.** The two Impact samples disagree, and the raw
  form is easy to truncate silently. This deserves the most test coverage.
- **Merchant URLs that need their params.** Strip list stays narrow (`th=1` is
  the worked example of a param to keep); `dryRun` exists for testing first.
- **RFD may change markers or wrappers.** Must degrade to "does nothing" rather
  than "mangles links".
- **Still unsampled:** a CJ (`anrdoezrs.net` etc.), ShareASale, AWIN or `prf.hn`
  link actually on RFD. Those table entries are guesses until one turns up.

## Steps

1. Copy the template into
   `redflagdeals-affiliate-cleaner/redflagdeals-affiliate-cleaner.user.js`, fill
   in metadata.
2. Implement `cleanUrl` + the redirector/param/denylist tables. Pure, no DOM.
3. **Verify against all ten saved pages before touching the DOM layer.** Expected
   results, as a test table:
   - Skimlinks/Yeti, Skimlinks/Meyer ×2, Skimlinks/CanadianTire,
     Skimlinks/TheShoeCompany → decoded merchant URL
   - Skimlinks/Amazon ×2 → decoded, then `tag` stripped
   - `bestbuyca.o93x.net` ×2 → full Best Buy URL incl. `?source=collection…`,
     minus `subId1`
   - `lenovo.evyy.net` → decoded Lenovo URL
   - `click.linksynergy.com` ×4 → decoded, minus `u1`
   - `avantlink.com` → `https://www.mec.ca/en/products/deals`
   - `amazon.ca/dp/B08LDN5451?th=1&tag=…` → `?th=1` kept, `tag` dropped
   - `canadiantire.ca/?utm_medium=Affiliate&CJEVENT=…` → bare origin
   - **untouched:** nav `redflagdeals.cheapoair.ca`, London Drugs deal button,
     both `shop.lululemon.com` tiles, `costco.ca` link, `amazon.ca` in-post link,
     every `ad.doubleclick.net` / `pubads.g.doubleclick.net` sponsor link, and
     every link on the Hot Deals listing page
4. DOM layer: scoped scan, cross-check, in-place rewrite, marker, CSS hint.
5. `MutationObserver` for late content.
6. Test on live pages with `dryRun` first; then confirm each cleaned link still
   lands on the right product page.
7. `node --check` (what CI runs), add the README table row, add a CHANGELOG
   section under a new `## redflagdeals-affiliate-cleaner` heading.
