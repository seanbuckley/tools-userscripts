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

  // Only list rows. [data-thread-id] is deliberately absent: the open-conversation
  // container carries it too, so including it made every middle click inside an
  // open thread reopen that thread in a duplicate tab — and swallowed middle-click
  // paste on Linux. threadUrl() still reads the attribute off the matched row.
  const getRow = (t) => t.closest && t.closest('tr.zA, [data-legacy-thread-id]');

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
  function currentView() {
    const hash = location.hash.replace(/^#/, '');
    if (!hash) return 'inbox';
    const parts = hash.split('/');
    const keep = PARAMETERISED_VIEWS.has(parts[0]) ? 2 : 1;
    return parts.slice(0, keep).join('/') || 'all';
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
    const acct = (location.pathname.match(/\/mail\/u\/(\d+)/) || [, '0'])[1];
    return `https://mail.google.com/mail/u/${acct}/#${currentView()}/${id}`;
  }

  // Suppress autoscroll before auxclick fires
  document.addEventListener('mousedown', (e) => {
    if (e.button !== 1) return;
    if (e.target.closest && e.target.closest('a[href]')) return;
    if (getRow(e.target)) e.preventDefault();
  }, true);

  document.addEventListener('auxclick', (e) => {
    if (e.button !== 1) return;
    // Let native middle-click handle genuine links inside a row.
    if (e.target.closest && e.target.closest('a[href]')) return;
    const row = getRow(e.target);
    if (!row) return;
    const url = threadUrl(row);
    if (!url) return;
    e.preventDefault();
    e.stopPropagation();
    openInTab(url);
  }, true);
})();
