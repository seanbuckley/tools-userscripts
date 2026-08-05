// ==UserScript==
// @name         Gmail Middle Click → Background Tab
// @namespace    https://github.com/seanbuckley/userscripts
// @version      2.1.0
// @description  Open Gmail threads in background tabs via middle click
// @author       Sean Buckley
// @license      MIT
// @match        https://mail.google.com/mail/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mail.google.com
// @grant        GM_openInTab
// @run-at       document-start
// @noframes
// @homepageURL  https://github.com/seanbuckley/userscripts
// @supportURL   https://github.com/seanbuckley/userscripts/issues
// @updateURL    https://raw.githubusercontent.com/seanbuckley/userscripts/master/gmail-middleclick/gmail-middleclick.user.js
// @downloadURL  https://raw.githubusercontent.com/seanbuckley/userscripts/master/gmail-middleclick/gmail-middleclick.user.js
// ==/UserScript==
(function () {
    'use strict';

    const getRow = (t) =>
        t.closest && t.closest('tr.zA, [data-legacy-thread-id], [data-thread-id]');

    // Gmail hashes look like "#inbox", "#inbox/<id>", "#search/<query>/<id>",
    // "#label/Some-Label/<id>". Reuse everything except a trailing message id so
    // the opened tab lands in the same view the click came from.
    function currentView() {
        const hash = location.hash.replace(/^#/, '');
        if (!hash) return 'inbox';
        const parts = hash.split('/');
        // A trailing segment that is a bare hex message id (legacy) or an
        // "FMfc..." permalink id (current Gmail) is dropped.
        if (parts.length > 1 && /^([0-9a-f]{6,}|FMfc[a-zA-Z0-9]+)$/i.test(parts[parts.length - 1])) {
            parts.pop();
        }
        const view = parts.join('/');
        return view || 'all';
    }

    function threadUrl(row) {
        const el = row.matches('[data-legacy-thread-id], [data-thread-id]')
            ? row
            : row.querySelector('[data-legacy-thread-id], [data-thread-id]');
        if (!el) return null;
        const raw = el.getAttribute('data-legacy-thread-id') ||
                    el.getAttribute('data-thread-id');
        if (!raw) return null;
        const id = raw.replace(/^thread-[fa]:/, '');
        const acct = (location.pathname.match(/\/mail\/u\/(\d+)/) || [, '0'])[1];
        return `https://mail.google.com/mail/u/${acct}/#${currentView()}/${id}`;
    }

    // Suppress autoscroll before auxclick fires
    document.addEventListener('mousedown', (e) => {
        if (e.button === 1 && getRow(e.target)) e.preventDefault();
    }, true);

    document.addEventListener('auxclick', (e) => {
        if (e.button !== 1) return;
        const row = getRow(e.target);
        if (!row) return;
        const url = threadUrl(row);
        if (!url) return;
        e.preventDefault();
        e.stopPropagation();
        GM_openInTab(url, { active: false, insert: true, setParent: true });
    }, true);
})();
