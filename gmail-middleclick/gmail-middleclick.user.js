// ==UserScript==
// @name         Gmail Middle Click → Background Tab
// @namespace    https://github.com/seanbuckley/userscripts
// @version      2.2.0
// @description  Open Gmail threads in background tabs via middle click
// @author       Sean Buckley
// @license      MIT
// @match        https://mail.google.com/mail/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mail.google.com
// @grant        GM_openInTab
// @grant        GM.openInTab
// @run-at       document-start
// @noframes
// @homepageURL  https://github.com/seanbuckley/userscripts
// @supportURL   https://github.com/seanbuckley/userscripts/issues
// @updateURL    https://raw.githubusercontent.com/seanbuckley/userscripts/master/gmail-middleclick/gmail-middleclick.user.js
// @downloadURL  https://raw.githubusercontent.com/seanbuckley/userscripts/master/gmail-middleclick/gmail-middleclick.user.js
// ==/UserScript==
(function () {
  'use strict';

  // GM_openInTab is Violentmonkey/Tampermonkey; `insert` and `setParent` are
  // manager-specific placement hints and are ignored elsewhere. GM.openInTab is
  // the Greasemonkey 4 equivalent and still honours `active: false`.
  //
  // window.open is the last resort and is a real downgrade — there is no way to
  // ask it for a background tab, so the click steals focus. That is the whole
  // point of this script, so it is a fallback, not an equivalent.
  const openInTab =
    typeof GM_openInTab === 'function'
      ? (url) => GM_openInTab(url, { active: false, insert: true, setParent: true })
      : typeof GM !== 'undefined' && GM && typeof GM.openInTab === 'function'
        ? (url) => GM.openInTab(url, { active: false })
        : (url) => window.open(url, '_blank');

  const getRow = (t) =>
    t.closest && t.closest('tr.zA, [data-legacy-thread-id], [data-thread-id]');

  // Views that carry an argument: "#label/Work", "#search/invoice". Everything
  // else ("#inbox", "#starred", "#snoozed") is a single segment.
  const PARAMETERISED_VIEWS = new Set(['label', 'search', 'advanced-search', 'category']);

  // Gmail hashes look like "#inbox", "#inbox/<id>", "#search/<query>/<id>",
  // "#label/Some-Label/<id>". Keep the view and drop anything after it, so the
  // opened tab lands in the same view the click came from.
  //
  // This counts segments rather than trying to recognise a thread id. Gmail has
  // several id formats (long hex, "FMfc…", "QgrcJ…", "Ktbx…") and matching them
  // by pattern means every unrecognised format leaks into the view path and
  // produces an unresolvable hash — while a pattern loose enough to catch them
  // all starts eating real search terms.
  function splitHash() {
    const parts = location.hash.replace(/^#/, '').split('/').filter(Boolean);
    if (!parts.length) return { view: 'inbox', openId: null };
    const keep = PARAMETERISED_VIEWS.has(parts[0]) ? 2 : 1;
    return {
      view: parts.slice(0, keep).join('/') || 'all',
      openId: parts[keep] || null,
    };
  }

  function threadUrl(row) {
    const el = row.matches('[data-legacy-thread-id], [data-thread-id]')
      ? row
      : row.querySelector('[data-legacy-thread-id], [data-thread-id]');
    if (!el) return null;
    const raw = el.getAttribute('data-legacy-thread-id') ||
                el.getAttribute('data-thread-id');
    if (!raw) return null;
    // data-legacy-thread-id is "thread-f:123…"; data-thread-id is "#thread-f:123…".
    // Leaving the "#" in place would put a second fragment marker in the URL and
    // truncate everything after it, landing on the bare inbox.
    const id = raw.replace(/^#?thread-[fa]:/, '');
    const { view, openId } = splitHash();
    // The open-conversation container carries data-thread-id too, so a click
    // inside an open thread matches it as a "row". Reopening the thread you are
    // already reading is never wanted, and claiming the click would swallow
    // middle-click paste on Linux — so decline and let the browser have it.
    //
    // Best-effort: the hash and the DOM attribute do not always use the same id
    // format, and when they disagree this comparison misses.
    if (openId && openId === id) return null;
    const acct = (location.pathname.match(/\/mail\/u\/(\d+)/) || [, '0'])[1];
    return `https://mail.google.com/mail/u/${acct}/#${view}/${id}`;
  }

  // What auxclick will do with this event, or null to leave it to the browser.
  function urlFor(target) {
    if (!target || !target.closest) return null;
    if (target.closest('a[href]')) return null;
    const row = getRow(target);
    return row ? threadUrl(row) : null;
  }

  // Suppress autoscroll before auxclick fires — but only when we are going to
  // claim the click, so clicks we decline keep their native behaviour.
  document.addEventListener('mousedown', (e) => {
    if (e.button !== 1) return;
    if (urlFor(e.target)) e.preventDefault();
  }, true);

  document.addEventListener('auxclick', (e) => {
    if (e.button !== 1) return;
    const url = urlFor(e.target);
    if (!url) return;
    e.preventDefault();
    e.stopPropagation();
    openInTab(url);
  }, true);
})();
