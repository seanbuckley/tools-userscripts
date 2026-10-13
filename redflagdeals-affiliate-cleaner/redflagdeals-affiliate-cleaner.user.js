// ==UserScript==
// @name         RedFlagDeals Affiliate Link Cleaner
// @namespace    https://github.com/seanbuckley/tools-userscripts
// @version      1.1.0
// @description  Point RedFlagDeals deal links and in-post links straight at the merchant instead of through an affiliate redirector
// @author       Sean Buckley
// @license      MIT
// @match        https://forums.redflagdeals.com/*
// @match        https://www.redflagdeals.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=redflagdeals.com
// @grant        none
// @run-at       document-idle
// @noframes
// @homepageURL  https://github.com/seanbuckley/tools-userscripts
// @supportURL   https://github.com/seanbuckley/tools-userscripts/issues
// @updateURL    https://raw.githubusercontent.com/seanbuckley/tools-userscripts/main/redflagdeals-affiliate-cleaner/redflagdeals-affiliate-cleaner.user.js
// @downloadURL  https://raw.githubusercontent.com/seanbuckley/tools-userscripts/main/redflagdeals-affiliate-cleaner/redflagdeals-affiliate-cleaner.user.js
// ==/UserScript==
(function () {
  'use strict';

  const CONFIG = {
    // Log every decision to the console and change nothing. Turn this on first
    // when RFD changes something and links stop being cleaned.
    dryRun: false,
    debug: false,
    // Underline cleaned links so a page with nothing cleaned is distinguishable
    // from a script that silently stopped working.
    markCleaned: true,
  };

  // ---------------------------------------------------------------------------
  // Tables
  // ---------------------------------------------------------------------------

  // Where each redirector keeps its destination, and how it is encoded:
  //   'encoded' — percent-encoded, one decodeURIComponent away
  //   'raw'     — a bare URL, whose own query string runs on into the
  //               wrapper's, so it cannot be read with URLSearchParams
  //   'sniff'   — either of the above, decided per link
  //
  // `seen` marks the entries confirmed against saved RFD pages. The rest are
  // the standard formats for networks RFD plausibly uses but that no sample has
  // shown, so they are guesses — if one misbehaves, that is where to look.
  const REDIRECTORS = [
    { host: /^go\.(redirectingat|skimresources)\.com$/, params: ['url'], encoding: 'encoded', seen: true },
    // Impact Radius. Publisher id 341376 is RFD's, across bestbuyca.o93x.net
    // and lenovo.evyy.net. `u` was percent-encoded on one and raw on the other,
    // hence 'sniff'.
    { host: /(^|\.)(o93x\.net|evyy\.net|7eer\.net|sjv\.io|pxf\.io)$/, params: ['u'], encoding: 'sniff', seen: true },
    { host: /^click\.linksynergy\.com$/, params: ['murl', 'RD_PARM1'], encoding: 'encoded', seen: true },
    { host: /(^|\.)avantlink\.com$/, params: ['url'], encoding: 'encoded', seen: true },
    { host: /(^|\.)shareasale\.com$/, params: ['urllink'], encoding: 'encoded', seen: false },
    { host: /(^|\.)awin1\.com$/, params: ['ued', 'p'], encoding: 'encoded', seen: false },
    { host: /(^|\.)redirect\.viglink\.com$/, params: ['u'], encoding: 'sniff', seen: false },
    // Commission Junction and prf.hn carry the destination in the path rather
    // than a query parameter, so they are handled by unwrapPath().
    { host: /(^|\.)(anrdoezrs\.net|dpbolvw\.net|kqzyfj\.com|tkqlhce\.com|jdoqocy\.com|prf\.hn)$/, inPath: true, seen: false },
  ];

  // Affiliate and click-tracking parameters, dropped wherever we act.
  // Lower-case; comparison is case-insensitive (RFD emits `CJEVENT`, Impact
  // emits `subId1`).
  const STRIP_PARAMS = new Set([
    'cjevent', 'cjdata', 'subid', 'subid1', 'subid2', 'subid3', 'u1',
    'irclickid', 'irgwc', 'ranmid', 'raneaid', 'ransiteid', 'siteid',
    'affid', 'affiliateid', 'sharedid', 'clickref', 'clickid', 'sscid', 'awc',
    'partner', 'sourceid', 'source_id', 'rfdid',
  ]);

  // Amazon's affiliate tag is the whole point on an Amazon URL, but `tag` is a
  // perfectly ordinary parameter elsewhere, so these apply to Amazon only.
  const AMAZON_HOST = /(^|\.)amazon\.(ca|com|com\.au|com\.br|com\.mx|com\.tr|co\.uk|co\.jp|de|fr|it|es|nl|se|pl|sg|in|ae|sa)$/;
  const AMAZON_STRIP_PARAMS = new Set(['tag', 'ascsubtag', 'linkcode', 'linkid', 'creative', 'creativeasin']);

  // Never touch a link that is somebody's paid placement. On the front page the
  // "Sponsors" row is built from the same markup as the real deal tiles, so
  // container scoping cannot tell them apart — only the host can.
  const AD_HOSTS = /(^|\.)(doubleclick\.net|googleadservices\.com|googlesyndication\.com|adnxs\.com|amazon-adsystem\.com)$/;

  // RFD's own hosts. Forum links, member profiles, the nav bar's travel portal
  // and the deal-alert form all live here and are none of our business.
  const RFD_HOST = /(^|\.)(redflagdeals\.com|rfdcontent\.com)$/;

  // Containers holding user-posted or deal content. Param stripping (as opposed
  // to unwrapping a known redirector) only happens inside these, because a bare
  // URL carrying tracking parameters is indistinguishable from RFD's own
  // internal links except by where it sits on the page.
  const CONTENT_SELECTOR = [
    '.post_content',            // forum posts and comments
    '.thread_header_buttons',   // the Get Deal button
    '.first_post',
    '.component_layout__images_tile',  // front-page deal tiles
    '.layouts__images_tile',
  ].join(',');

  // Anchors worth looking at. Unwrapping is safe anywhere on the page (the host
  // has to be a known redirector), so this is deliberately broad.
  const LINK_SELECTOR = 'a[href]';

  const log = (...args) => {
    if (CONFIG.debug || CONFIG.dryRun) console.log('[rfd-cleaner]', ...args);
  };

  // ---------------------------------------------------------------------------
  // URL cleaning — pure, no DOM
  // ---------------------------------------------------------------------------

  function parseUrl(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      // A hostname with no dot is a bare label ("localhost", or junk left over
      // from a half-decoded URL) and never a merchant.
      if (!url.hostname || !url.hostname.includes('.')) return null;
      return url;
    } catch {
      return null;
    }
  }

  const redirectorFor = (hostname) => REDIRECTORS.find((r) => r.host.test(hostname)) || null;

  // Read a query parameter's raw, still-encoded text. URLSearchParams is no use
  // here: it percent-decodes, and it stops at the `&` that an unencoded
  // destination needs to keep.
  //
  // Returns both readings, because which one is right depends on the encoding:
  //   bounded — up to the next `&`, i.e. the parameter as the wrapper meant it
  //   toEnd   — everything after `=`, for a destination whose own `&`
  //             separators are sitting unescaped in the wrapper's query string
  function rawParam(url, name) {
    const query = url.search.replace(/^\?/, '');
    if (!query) return null;
    const key = name.toLowerCase();
    let index = 0;
    while (index < query.length) {
      const eq = query.indexOf('=', index);
      if (eq === -1) return null;
      const amp = query.indexOf('&', index);
      if (amp !== -1 && amp < eq) {
        // A valueless parameter ("&xs&url=…"): skip it rather than reading the
        // next parameter's `=` as this one's.
        index = amp + 1;
        continue;
      }
      if (query.slice(index, eq).toLowerCase() === key) {
        const rest = query.slice(eq + 1);
        const nextAmp = rest.indexOf('&');
        return { bounded: nextAmp === -1 ? rest : rest.slice(0, nextAmp), toEnd: rest };
      }
      if (amp === -1) return null;
      index = amp + 1;
    }
    return null;
  }

  // Trailing `&subId1=…` / `?subId1=…` glued onto an unencoded destination.
  // This has to work textually because the destination may have no query string
  // of its own — bestbuyca.o93x.net produced
  // `…/product/…/16250764&subId1=f2823256`, where the affiliate's parameter
  // hangs off the path with no `?` in sight and so is invisible to URL parsing.
  function trimTrailingAffiliateParams(text) {
    let out = text;
    for (let guard = 0; guard < 10; guard += 1) {
      const match = out.match(/[?&]([A-Za-z0-9_-]+)=[^?&]*$/);
      if (!match || !STRIP_PARAMS.has(match[1].toLowerCase())) break;
      out = out.slice(0, match.index);
    }
    return out;
  }

  const decodeEncoded = (value) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  };

  // Decide between the two readings and undo whatever encoding was used.
  // 'sniff' exists because Impact Radius disagrees with itself: `u` arrived
  // percent-encoded from lenovo.evyy.net and bare from bestbuyca.o93x.net.
  function decodeDestination(raw, encoding) {
    const encoded = /^https?%3(a|A)/.test(raw.bounded);
    const bare = /^https?:\/\//i.test(raw.bounded);
    if (encoding === 'encoded' || (encoding === 'sniff' && encoded)) {
      return decodeEncoded(raw.bounded);
    }
    if (encoding === 'raw' || (encoding === 'sniff' && bare)) {
      return trimTrailingAffiliateParams(raw.toEnd);
    }
    return null;
  }

  // CJ and prf.hn put the destination in the path:
  //   anrdoezrs.net/links/<id>/type/dlg/https://merchant.example/…
  //   prf.hn/click/…/destination:https%3A%2F%2Fmerchant.example/…
  function unwrapPath(url) {
    const path = url.pathname + url.search;
    const match = path.match(/(?:destination[:=]|\/)(https?(?::\/\/|%3(?:a|A)%2(?:f|F)%2(?:f|F)).+)$/);
    if (!match) return null;
    const value = match[1];
    return /^https?:\/\//i.test(value) ? value : decodeEncoded(value);
  }

  function unwrapOnce(url) {
    const entry = redirectorFor(url.hostname);
    if (!entry) return null;
    if (entry.inPath) return unwrapPath(url);
    for (const name of entry.params) {
      const raw = rawParam(url, name);
      if (!raw) continue;
      const destination = decodeDestination(raw, entry.encoding);
      if (destination) return destination;
    }
    return null;
  }

  // Returns whether anything was actually dropped, so a link nobody needs to
  // touch is left byte-for-byte alone. Reading `url.href` back after any
  // searchParams access re-serialises the whole query, which can change escaping
  // that was fine as it was — so a rewrite has to be earned, not incidental.
  function stripParams(url) {
    const isAmazon = AMAZON_HOST.test(url.hostname);

    // An Amazon product URL is identified by its ASIN, and everything else in it
    // is disposable: the affiliate marker RFD leaves is `ref_=as_li_ss_tl`, but
    // the `tag=`, `pf_rd_*`, `sbo`, `psc`, `th` and the `/ref=…` path segment are
    // all tracking or session cruft that a narrow parameter list keeps missing.
    // So for a product page we keep the path up to and including the ASIN — slug
    // and all, matching what the address bar shows — and drop the rest.
    if (isAmazon) {
      const asin = url.pathname.match(
        /\/(?:dp|gp\/product|gp\/aw\/d|gp\/offer-listing|gp\/aw\/d)\/([A-Z0-9]{10})(?=[/?]|$)/i,
      );
      if (asin) {
        const end = asin.index + asin[0].length;
        const trimmedPath = url.pathname.slice(0, end);
        if (trimmedPath !== url.pathname || url.search) {
          url.pathname = trimmedPath;
          url.search = '';
          return true;
        }
        return false;
      }
      // A non-product Amazon URL (search, storefront) keeps its query — dropping
      // it would throw away the search terms — so it falls through to the
      // parameter-by-parameter strip below.
    }

    // Read the names first: deleting while iterating a live URLSearchParams
    // skips entries.
    const names = [...new Set([...url.searchParams.keys()])];
    if (!names.length) return false;

    // utm_* is normal analytics on most links and only worth removing when the
    // campaign is the affiliate relationship itself, which is what these two
    // values tell us.
    let dropped = false;
    const utmIsAffiliate = ['utm_source', 'utm_medium', 'utm_campaign'].some((key) => {
      const value = url.searchParams.get(key);
      return value && /redflagdeals|affiliate/i.test(value);
    });

    for (const name of names) {
      const key = name.toLowerCase();
      const drop =
        STRIP_PARAMS.has(key) ||
        (isAmazon && AMAZON_STRIP_PARAMS.has(key)) ||
        (utmIsAffiliate && key.startsWith('utm_'));
      if (drop) {
        url.searchParams.delete(name);
        dropped = true;
      }
    }
    return dropped;
  }

  /**
   * Returns a cleaned absolute URL, or null to leave the link alone.
   *
   * @param {string} href           the link's current href
   * @param {object} [options]
   * @param {boolean} [options.allowStripOnly]  strip tracking parameters even
   *   when no redirector was unwrapped. Only true inside deal/post content.
   * @param {string} [options.expectHost]  a host parsed from the link's visible
   *   text, used as a cross-check.
   */
  function cleanUrl(href, options = {}) {
    const original = parseUrl(href);
    if (!original) return null;
    if (AD_HOSTS.test(original.hostname)) {
      log('skip: ad host', original.hostname);
      return null;
    }

    let current = original;
    let unwrapped = false;
    for (let guard = 0; guard < 5; guard += 1) {
      const next = unwrapOnce(current);
      if (!next) break;
      const parsed = parseUrl(next);
      if (!parsed) {
        log('refuse: destination did not parse', next);
        return null;
      }
      // A redirector that unwraps to itself means the extraction went wrong.
      if (parsed.hostname === current.hostname) {
        log('refuse: destination is the redirector itself', next);
        return null;
      }
      current = parsed;
      unwrapped = true;
    }

    if (!unwrapped && !options.allowStripOnly) return null;

    // Still on a redirector after the loop: either a shape we half-understand
    // or nesting deeper than the cap. Either way, do not touch it.
    if (redirectorFor(current.hostname)) {
      log('refuse: still a redirector', current.href);
      return null;
    }
    if (AD_HOSTS.test(current.hostname) || RFD_HOST.test(current.hostname)) {
      log('refuse: destination is an ad or RFD host', current.href);
      return null;
    }

    const cleaned = new URL(current.href);
    const dropped = stripParams(cleaned);
    // Nothing unwrapped and nothing stripped means there was never anything
    // wrong with this link.
    if (!unwrapped && !dropped) return null;

    // The link's visible text is usually the clean URL already. It is truncated
    // for display, so only the host is comparable — but a host mismatch means
    // the unwrap landed somewhere the page never claimed, which is exactly the
    // failure worth refusing.
    if (options.expectHost && options.expectHost !== cleaned.hostname) {
      log('refuse: host disagrees with link text', cleaned.hostname, '!=', options.expectHost);
      return null;
    }

    const result = cleaned.href;
    return result === href ? null : result;
  }

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------

  // RFD renders the destination as text next to the link: the Get Deal button
  // has a `deal_info_url_display` span, and an autolinked URL in a post uses the
  // URL as its own link text. Both are truncated with an ellipsis when long, so
  // only the host is usable.
  function expectedHost(anchor) {
    const display = anchor.querySelector('.deal_info_url_display');
    const candidates = [display && display.textContent, anchor.textContent];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const text = candidate.trim().replace(/[…]+$/, '').replace(/\.\.\.$/, '');
      if (!/^https?:\/\//i.test(text)) continue;
      // Truncation can cut mid-host, which would produce a bogus mismatch.
      // Require a delimiter after the host before trusting it.
      const match = text.match(/^https?:\/\/([^/?#\s]+)[/?#]/);
      if (match) return match[1].toLowerCase();
    }
    return null;
  }

  function processAnchor(anchor) {
    if (anchor.dataset.rfdCleaned) return false;
    const href = anchor.getAttribute('href');
    if (!href) return false;

    const cleaned = cleanUrl(href, {
      allowStripOnly: Boolean(anchor.closest(CONTENT_SELECTOR)),
      expectHost: expectedHost(anchor),
    });
    if (!cleaned) return false;

    if (CONFIG.dryRun) {
      log('would clean\n  from', href, '\n    to', cleaned);
      return false;
    }

    anchor.dataset.rfdCleaned = '1';
    anchor.setAttribute('href', cleaned);
    // Force `rel="noreferrer noopener"`. The affiliate link used to bounce
    // through the redirector, so the merchant only ever saw the redirector as
    // the referrer; pointing straight at the merchant would instead hand it
    // `forums.redflagdeals.com`. Best Buy's bot wall (Akamai) denies exactly
    // that — the direct URL loads fine when typed but 403s when clicked from
    // RFD — and sending no referrer is the right call anyway once the affiliate
    // relationship is gone. `noopener` comes along because these open in a new
    // tab. Existing tokens (RFD's `nofollow`) are kept.
    const rel = new Set((anchor.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
    rel.add('noreferrer');
    rel.add('noopener');
    anchor.setAttribute('rel', [...rel].join(' '));
    // Replace RFD's "RedFlagDeals.com Affiliate Link" title, which is no longer
    // true of this link.
    anchor.title = `Cleaned → ${new URL(cleaned).hostname}`;
    log('cleaned\n  from', href, '\n    to', cleaned);
    return true;
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return 0;
    let count = 0;
    if (root.matches && root.matches(LINK_SELECTOR)) count += processAnchor(root) ? 1 : 0;
    for (const anchor of root.querySelectorAll(LINK_SELECTOR)) {
      count += processAnchor(anchor) ? 1 : 0;
    }
    return count;
  }

  function addMarkerStyles() {
    if (!CONFIG.markCleaned || document.getElementById('rfd-cleaner-style')) return;
    const style = document.createElement('style');
    style.id = 'rfd-cleaner-style';
    style.textContent =
      'a[data-rfd-cleaned]{text-decoration-color:#2e9e5b!important;' +
      'text-decoration-line:underline!important;text-decoration-style:dotted!important;}';
    (document.head || document.documentElement).appendChild(style);
  }

  addMarkerStyles();
  const initial = scan(document.body);
  log(`cleaned ${initial} link(s) on load`);

  // Quote previews, the front page's sliders and any lazily inserted post
  // content arrive after load. Batch them: a burst of mutations should cost one
  // scan, not one per node.
  let pending = [];
  let scheduled = false;
  const flush = () => {
    scheduled = false;
    const roots = pending;
    pending = [];
    let count = 0;
    for (const root of roots) count += scan(root);
    if (count) log(`cleaned ${count} link(s) after mutation`);
  };

  new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === 1) pending.push(node);
      }
    }
    if (pending.length && !scheduled) {
      scheduled = true;
      setTimeout(flush, 100);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  // Exposed for testing from the console and by this repo's checks — call
  // `__rfdAffiliateCleaner.cleanUrl(href, { allowStripOnly: true })` to see what
  // a given link would become without touching the page.
  window.__rfdAffiliateCleaner = { cleanUrl, CONFIG, scan };
})();
