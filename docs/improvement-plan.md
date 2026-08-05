# Repo Review & Improvement Plan

Review of `seanbuckley/userscripts` as of commit `7ab79a4`.

Repo contents: `README.md`, `.vscode/settings.json`, `.gitignore`, and one active
script, `gmail-middleclick/gmail-middleclick.js`. The Zealty script was removed in
`7ab79a4`, so the Gmail script is the only code left.

---

## Part 1 — Review findings

Findings are ordered by severity. Each has an ID referenced by the task list in Part 2.

### Blockers (the repo does not work as documented)

**F1 — The script file is not named `*.user.js`, so it cannot be installed.**
Userscript managers (Violentmonkey, Tampermonkey, Greasemonkey) only intercept a
URL and offer to install it when the path ends in `.user.js`. The current file is
`gmail-middleclick/gmail-middleclick.js`, so clicking *Raw* on GitHub just shows
source text. The README's installation instructions therefore fail for the only
script in the repo. The removed Zealty script did this correctly
(`zealty.ca.user.js`).

**F2 — README contradicts itself about the extension.**
Step 1 says install Violentmonkey; step 2 says "The script will be recognized by
Tampermonkey". It also lists no scripts, so a visitor cannot tell what is here.

### Correctness bugs in `gmail-middleclick.js`

**F3 — Search and label views produce a broken URL.**
`threadUrl()` derives the view with `location.hash.match(/^#([^/?]+)/)`, taking only
the first hash segment. In a search view the hash is `#search/<query>/<msgid>`, so
the view collapses to `search` and the query term is dropped. The generated URL
`#search/<id>` is not a valid Gmail search-result thread link. Same class of problem
for nested label views (`#label/Parent-Child/...` survives, but `#search` does not).
Fix: strip only the trailing message-id segment from the current hash and reuse the
rest; fall back to `all` when there is nothing usable. `#all/<id>` opens any thread
regardless of which view it lives in, so it is a safe default.

**F4 — Middle-clicking a real link inside a row is hijacked.**
The `auxclick` handler calls `preventDefault()` + `stopPropagation()` for any middle
click whose target is inside a matched row. Gmail rows can contain genuine anchors
(attachment chips, calendar RSVP links, promo-tab links). Middle-clicking one of
those should open *that link*, not the thread. The handler needs to bail out when
`e.target.closest('a[href]')` matches, letting the browser's native behaviour run.

**F5 — No fallback when `GM_openInTab` is unavailable.**
If the script runs under a manager that only exposes the promise-based
`GM.openInTab` (Greasemonkey 4+), or if the grant is stripped, the handler throws a
`ReferenceError` *after* it has already called `preventDefault()` — so the click is
swallowed and nothing opens. Resolve the opener once at startup and fall back to
`window.open(url, '_blank')`.

**F6 — `insert` / `setParent` are manager-specific options.**
`GM_openInTab(url, { active: false, insert: true, setParent: true })` uses options
that Violentmonkey and Tampermonkey support but that are not part of any shared
spec. This is fine in practice, but it should be stated in the script header /
README so a user on another manager knows why tab placement differs.

### Robustness / metadata

**F7 — Account id is captured once at load.**
`acct` is read from `location.pathname` at `document-end` and never recomputed.
Switching accounts is normally a full navigation, so this rarely bites, but reading
it inside `threadUrl()` costs nothing and removes the failure mode entirely.

**F8 — The metadata block is missing most standard keys.**
No `@author`, `@license`, `@icon`, `@homepageURL`, `@supportURL`, `@updateURL`, or
`@downloadURL`. Without `@updateURL`/`@downloadURL` installed copies never
auto-update. `@namespace` is the bare string `gmail-middleclick` rather than the
repo URL, which is the convention the Zealty script used. `@version 2.0` should be
semver (`2.0.0`).

**F9 — `@match` is broader than needed.**
`https://mail.google.com/*` covers non-mail paths on that host. `https://mail.google.com/mail/*`
is the precise target. Adding `@noframes` also avoids running inside embedded
iframes.

**F10 — No `@run-at document-start`.**
Listeners are attached to `document` with capture, so `document-end` works, but the
mousedown autoscroll suppression is the kind of thing that benefits from being
registered as early as possible. Low priority; safe either way.

### Repo hygiene

**F11 — No `LICENSE` file** even though scripts declare `@license MIT`.

**F12 — Inconsistent layout and formatting.** Zealty lived at the repo root, Gmail
lives in a subdirectory. Zealty used 2-space indentation, Gmail uses 4-space. Pick
one of each and record it. Recommendation: one directory per script (scales better),
and an `.editorconfig` pinning the indent.

**F13 — Stale spell-check dictionary.** `.vscode/settings.json` still lists
`"Zealty"` (script deleted) and lacks words the current code and docs use:
`Violentmonkey`, `Tampermonkey`, `auxclick`, `Greasemonkey`, `noframes`.

### Deliberately not recommended

- **CI / GitHub Actions lint** — for a two-file hobby repo the maintenance cost
  exceeds the benefit. Revisit if the script count grows past ~5.
- **A build step or bundler** — userscripts are meant to be readable single files.
- **A test suite** — the script is pure DOM glue against a closed, unstable target
  (Gmail's markup). Manual verification in-browser is the realistic check.

---

## Part 2 — Execution plan

Tasks are ordered and self-contained. Do them one at a time, in order, and commit
after each numbered task. Do not combine tasks. Do not make changes that are not
listed here.

**Before starting:** confirm you are on branch `claude/review-improvement-plan-dob4df`
with `git status`. If not, stop and ask.

---

### Task 1 — Rename the script to `.user.js` (fixes F1)

Run exactly:

```
git mv gmail-middleclick/gmail-middleclick.js gmail-middleclick/gmail-middleclick.user.js
```

Verify: `ls gmail-middleclick/` prints `gmail-middleclick.user.js` and nothing else.

Commit message: `fix(gmail-middleclick): rename to .user.js so managers can install it`

---

### Task 2 — Complete the metadata block (fixes F6, F8, F9)

Open `gmail-middleclick/gmail-middleclick.user.js`. Replace the entire block from
the line `// ==UserScript==` through the line `// ==/UserScript==` (inclusive) with
exactly this:

```js
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
```

Note the `@run-at` change to `document-start` — that also covers F10.

**Check the default branch name before committing.** Run `git remote show origin | grep "HEAD branch"`.
If it prints something other than `master`, replace `master` in both the `@updateURL`
and `@downloadURL` lines with the branch name it printed.

Commit message: `chore(gmail-middleclick): complete userscript metadata block`

---

### Task 3 — Fix the view/URL derivation (fixes F3, F7)

In the same file, find the function `threadUrl(row)`. Replace the whole function,
and delete the now-unused module-level `acct` line above it
(`const acct = (location.pathname.match(...))[1];`), with this:

```js
    // Gmail hashes look like "#inbox", "#inbox/<id>", "#search/<query>/<id>",
    // "#label/Some-Label/<id>". Reuse everything except a trailing message id so
    // the opened tab lands in the same view the click came from.
    function currentView() {
        const hash = location.hash.replace(/^#/, '');
        if (!hash) return 'inbox';
        const parts = hash.split('/');
        // A trailing segment that is a bare hex message id is dropped.
        if (parts.length > 1 && /^[0-9a-f]{6,}$/i.test(parts[parts.length - 1])) {
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
```

Verify: search the file for `acct` — it must appear only inside `threadUrl`, twice
(the `const acct = ...` line and the `${acct}` in the template string).

Commit message: `fix(gmail-middleclick): preserve search and label views in thread URLs`

---

### Task 4 — Don't hijack real links (fixes F4)

In the `auxclick` listener, immediately after the line `if (e.button !== 1) return;`,
insert this line:

```js
        // Let native middle-click handle genuine links inside a row.
        if (e.target.closest && e.target.closest('a[href]')) return;
```

Then apply the same guard to the `mousedown` listener so autoscroll suppression also
skips links. Replace the mousedown handler body condition:

```js
        if (e.button === 1 && getRow(e.target)) e.preventDefault();
```

with:

```js
        if (e.button !== 1) return;
        if (e.target.closest && e.target.closest('a[href]')) return;
        if (getRow(e.target)) e.preventDefault();
```

Commit message: `fix(gmail-middleclick): let native middle-click handle links in rows`

---

### Task 5 — Add a `GM_openInTab` fallback (fixes F5)

Directly below the `'use strict';` line, insert:

```js
    // GM_openInTab is Violentmonkey/Tampermonkey. `insert` and `setParent` are
    // manager-specific placement hints and are ignored elsewhere. Fall back to
    // window.open so the click still does something under other managers.
    const openInTab =
        typeof GM_openInTab === 'function'
            ? (url) => GM_openInTab(url, { active: false, insert: true, setParent: true })
            : (url) => window.open(url, '_blank');
```

Then in the `auxclick` handler, replace the line:

```js
        GM_openInTab(url, { active: false, insert: true, setParent: true });
```

with:

```js
        openInTab(url);
```

Verify: `GM_openInTab` now appears exactly twice in the file — once in the
`@grant` line and once in the `typeof` check.

Commit message: `fix(gmail-middleclick): fall back to window.open when GM_openInTab is absent`

---

### Task 6 — Add a LICENSE file (fixes F11)

Create `LICENSE` at the repo root containing the standard MIT License text, with
copyright line:

```
Copyright (c) 2026 Sean Buckley
```

Use the canonical MIT text verbatim; do not paraphrase it.

Commit message: `docs: add MIT LICENSE`

---

### Task 7 — Add `.editorconfig` (fixes F12)

Create `.editorconfig` at the repo root:

```
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 4

[*.md]
trim_trailing_whitespace = false
```

Also confirm `gmail-middleclick.user.js` ends with a newline; add one if it does not
(the original file did not have a trailing newline).

Commit message: `chore: add .editorconfig`

---

### Task 8 — Rewrite the README (fixes F2, F12)

Replace the whole of `README.md` with:

```markdown
# UserScripts

Custom user scripts for web annoyances.

## Scripts

| Script | Site | What it does |
| --- | --- | --- |
| [Gmail Middle Click → Background Tab](gmail-middleclick/gmail-middleclick.user.js) | mail.google.com | Middle-click a thread in the list to open it in a background tab, instead of triggering autoscroll. |

## Installation

1. Install [Violentmonkey](https://violentmonkey.github.io/) (or another userscript
   manager, such as Tampermonkey) in your browser.
2. Click the script link in the table above, then click the **Raw** button. Your
   userscript manager will recognise the `.user.js` file and offer to install it.

Tested with Violentmonkey and Tampermonkey. Other managers should work, but
background-tab placement may differ — the tab-position hints used by the Gmail
script are manager-specific.

## Layout

One directory per script, named after the script. Each script file is named
`<name>.user.js` — the `.user.js` suffix is what lets a userscript manager
intercept the Raw URL and install it.

## Licence

[MIT](LICENSE)
```

Commit message: `docs: list scripts, fix installation instructions, document layout`

---

### Task 9 — Refresh the spell-check dictionary (fixes F13)

Replace the contents of `.vscode/settings.json` with:

```json
{
  "cSpell.words": [
    "auxclick",
    "Greasemonkey",
    "noframes",
    "Tampermonkey",
    "Userscript",
    "Violentmonkey"
  ]
}
```

Commit message: `chore: refresh cSpell dictionary`

---

### Task 10 — Final verification

Run these and confirm each result:

1. `node --check gmail-middleclick/gmail-middleclick.user.js` — must exit 0 with no
   output. (This only checks syntax; `GM_openInTab` being undefined outside a browser
   is expected and does not affect the check.)
2. `git status` — working tree clean.
3. `ls` at the repo root — shows `LICENSE`, `README.md`, `.editorconfig`,
   `docs/`, `gmail-middleclick/`.
4. `git log --oneline -10` — shows the commits from tasks 1–9.

Then push with `git push -u origin claude/review-improvement-plan-dob4df` and open a
**draft** pull request.

**Manual browser check (cannot be automated — report as untested if you cannot do it):**
install the script in Violentmonkey, open Gmail, and confirm: middle-clicking a row
in the inbox opens a background tab; the same works from a search-results list and
the resulting tab shows the thread; middle-clicking an attachment chip or link inside
a row opens that link, not the thread; no autoscroll cursor appears.

---

## Task dependency notes

- Task 1 must come first; tasks 2–5 all edit the renamed file.
- Tasks 2, 3, 4, 5 touch the same file but different regions — do them in order and
  they will not conflict.
- Tasks 6, 7, 9 are independent of everything else and can be done in any order.
- Task 8 references `LICENSE`, so do it after task 6.
