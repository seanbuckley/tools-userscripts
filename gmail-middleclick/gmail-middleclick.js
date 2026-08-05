// ==UserScript==
// @name         Gmail Middle Click → Background Tab
// @namespace    gmail-middleclick
// @version      2.0
// @description  Open Gmail threads in background tabs via middle click
// @match        https://mail.google.com/*
// @grant        GM_openInTab
// @run-at       document-end
// ==/UserScript==
(function () {
    'use strict';

    const acct = (location.pathname.match(/\/mail\/u\/(\d+)/) || [, '0'])[1];

    const getRow = (t) =>
        t.closest && t.closest('tr.zA, [data-legacy-thread-id], [data-thread-id]');

    function threadUrl(row) {
        const el = row.matches('[data-legacy-thread-id], [data-thread-id]')
            ? row
            : row.querySelector('[data-legacy-thread-id], [data-thread-id]');
        if (!el) return null;
        const raw = el.getAttribute('data-legacy-thread-id') ||
                    el.getAttribute('data-thread-id');
        if (!raw) return null;
        const id = raw.replace(/^thread-[fa]:/, '');
        const view = (location.hash.match(/^#([^/?]+)/) || [, 'inbox'])[1];
        return `https://mail.google.com/mail/u/${acct}/#${view}/${id}`;
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