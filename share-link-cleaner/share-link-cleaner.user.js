// ==UserScript==
// @name         Share Link Cleaner
// @namespace    https://github.com/seanbuckley/userscripts
// @version      1.0.0
// @description  Strip share and referral tracking parameters (Reddit share_id, ?ref=selfh.st) from the address bar so a copied or saved URL comes out clean
// @author       Sean Buckley
// @license      MIT
// @match        *://*/*
// @grant        none
// @run-at       document-start
// @noframes
// @homepageURL  https://github.com/seanbuckley/userscripts
// @supportURL   https://github.com/seanbuckley/userscripts/issues
// @updateURL    https://raw.githubusercontent.com/seanbuckley/userscripts/master/share-link-cleaner/share-link-cleaner.user.js
// @downloadURL  https://raw.githubusercontent.com/seanbuckley/userscripts/master/share-link-cleaner/share-link-cleaner.user.js
// ==/UserScript==
(function () {
  'use strict';

  // This runs after the page has been requested, so it cannot stop the server
  // seeing the parameter. It fixes what ends up in the address bar, bookmarks
  // and Obsidian. The uBlock Origin filters in this script's README strip the
  // parameter before the request is sent; this is the fallback without uBO.

  const CONFIG = {
    // Log what would change and leave the address bar alone.
    dryRun: false,
    debug: false,
  };

  // Each rule names the hosts it applies to and the parameters to drop there.
  //   host:     matched against location.hostname; `null` means every site
  //   names:    parameter names to drop whatever their value
  //   prefixes: drop any parameter whose name starts with one of these
  //   pairs:    exact name/value pairs to drop, for a name that is content
  //             elsewhere (`ref` is a real parameter on plenty of sites)
  const RULES = [
    // Reddit app share sheet. share_id ties the visit to whoever shared it;
    // older app builds used utm_* instead. Neither is ever page content.
    { host: /(^|\.)reddit\.com$/, names: ['share_id'], prefixes: ['utm_'] },
    // Ghost newsletters tag every outbound link with ?ref=<newsletter host>.
    // Only selfh.st's own value is dropped, so other uses of `ref` survive.
    { host: null, pairs: [['ref', 'selfh.st']] },
  ];

  function dropParam(rule, name, value) {
    if (rule.names && rule.names.includes(name)) return true;
    if (rule.prefixes && rule.prefixes.some((p) => name.startsWith(p))) return true;
    if (rule.pairs && rule.pairs.some(([n, v]) => n === name && v === value)) return true;
    return false;
  }

  // Returns the cleaned URL, or null when there is nothing to remove. Rebuilds
  // the query from the surviving raw segments, so their encoding is untouched.
  function cleanUrl(href) {
    let url;
    try {
      url = new URL(href);
    } catch {
      return null;
    }
    if (!url.search) return null;

    const rules = RULES.filter((r) => !r.host || r.host.test(url.hostname));
    if (!rules.length) return null;

    const kept = [];
    let dropped = false;
    for (const segment of url.search.slice(1).split('&')) {
      if (!segment) continue;
      const eq = segment.indexOf('=');
      const rawName = eq === -1 ? segment : segment.slice(0, eq);
      const rawValue = eq === -1 ? '' : segment.slice(eq + 1);
      let name, value;
      try {
        name = decodeURIComponent(rawName.replace(/\+/g, ' '));
        value = decodeURIComponent(rawValue.replace(/\+/g, ' '));
      } catch {
        kept.push(segment);
        continue;
      }
      if (rules.some((r) => dropParam(r, name, value))) {
        dropped = true;
      } else {
        kept.push(segment);
      }
    }
    if (!dropped) return null;

    url.search = kept.length ? '?' + kept.join('&') : '';
    return url.href;
  }

  window.__shareLinkCleaner = { cleanUrl, RULES };

  if (typeof location === 'undefined' || typeof history === 'undefined') return;

  const cleaned = cleanUrl(location.href);
  if (!cleaned) return;
  if (CONFIG.dryRun || CONFIG.debug) {
    console.log('[share-link-cleaner]', location.href, '→', cleaned);
  }
  if (!CONFIG.dryRun) {
    // replaceState, not a redirect: no reload, no second request, and the
    // tracked URL does not stay behind in the back button history.
    history.replaceState(history.state, '', cleaned);
  }
})();
