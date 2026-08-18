# Changelog

All notable changes to the scripts in this repo are documented here.

## redflagdeals-affiliate-cleaner

### 1.0.0

- Initial release: rewrite RedFlagDeals deal links and in-post links to point at
  the merchant directly.
- Unwraps Skimlinks (`go.redirectingat.com`), Impact Radius (`*.o93x.net`,
  `*.evyy.net`), Rakuten/LinkSynergy (`click.linksynergy.com`) and AvantLink,
  all confirmed against saved pages; entries for Commission Junction,
  ShareASale, AWIN, prf.hn and VigLink are those networks' standard formats but
  are unconfirmed on RFD and marked as such in the code.
- Impact Radius `u=` is percent-encoded on some hosts and bare on others, so the
  encoding is detected per link. The bare form is the awkward one: the
  destination's own query string runs on into the wrapper's, and the affiliate's
  `subId1` can hang off the path with no `?` at all, where no URL parser sees it.
- Strips affiliate parameters (`CJEVENT`, `subId1`, `u1`, Amazon's `tag`, and
  `utm_*` only when the campaign names RedFlagDeals or "affiliate") from links
  that arrive unwrapped, and from the result of unwrapping.
- Parameter stripping is confined to deal and post containers, because a bare URL
  carrying tracking parameters is otherwise indistinguishable from RFD's own
  internal links. Unwrapping a known redirector is safe anywhere on the page.
- Leaves paid placements alone. On the front page the "Sponsors" row is built
  from the same markup as the real deal tiles, so only the host distinguishes
  them; doubleclick and friends are on a denylist.
- Cross-checks the destination against the host shown in the link's own text
  (`deal_info_url_display`, or an autolinked URL's text) and declines the rewrite
  when they disagree. Those strings are truncated for display, so only the host
  is comparable.
- Marks cleaned links with `data-rfd-cleaned` and a dotted green underline, so a
  page with nothing to clean is distinguishable from a script that has stopped
  working. `CONFIG.dryRun` logs what would change without touching the page.

## gmail-middleclick

### 2.3.0

- Open middle-clicked links inside an email in a background tab. Gmail calls
  `preventDefault()` and `stopPropagation()` on the auxclick for links in a
  message body (`_.iq.prototype.preventDefault` in its `m=b` bundle), so the
  browser never opens them and the click does nothing at all. The script now
  claims those clicks from its capture-phase listener, which runs before
  Gmail's, and opens the href itself. Confined to links inside a rendered
  message: list rows, the left nav and Gmail's own chrome already work and are
  left to the browser. `javascript:`, `mailto:`, `data:` and bare fragments are
  declined.

### 2.2.1

- Stop hijacking middle clicks inside an open conversation. The 2.2.0 guard
  compared the row's thread id with the id in the hash, but Gmail routinely uses
  different formats for the two (`#inbox/FMfcgz…` against
  `data-thread-id="#thread-f:<digits>"`), so the comparison missed and every
  middle click in the message body or thread header opened a redundant
  background tab of the thread already on screen — and swallowed autoscroll and
  middle-click paste along with it. The open conversation is now recognised by
  the rendered messages it contains (`data-message-id` /
  `data-legacy-message-id`), which no list row has, so it no longer depends on
  either id format. The id comparison stays as a second check for the
  split-pane case.

### 2.2.0

- Derive the view by counting hash segments instead of pattern-matching a thread
  id. Gmail uses several id formats (`FMfc…`, `QgrcJ…`, `Ktbx…`, long hex) and the
  old regex only knew two, so the rest leaked into the view path and produced an
  unresolvable URL.
- Strip the leading `#` from `data-thread-id`. It was passed through into the
  generated URL as a second fragment marker, truncating the rest and landing on
  the bare inbox.
- Decline the click when the row's thread is the one already open. The
  open-conversation container carries `data-thread-id` too, so middle-clicking
  inside an open thread reopened it in a duplicate tab and swallowed
  middle-click paste on Linux. Best-effort: the hash and the DOM attribute do
  not always use the same id format, and the check misses when they disagree.
- Only suppress autoscroll on mousedown when the click is one we will actually
  claim, so declined clicks keep their native behaviour.
- Use `GM.openInTab` (Greasemonkey 4) before falling back to `window.open`, which
  cannot open a background tab and so steals focus.

### 2.1.1

- Stopped treating short hex-looking search terms (e.g. `#search/abc123`) as a
  trailing message id, which collapsed the view and produced a broken thread URL.

### 2.1.0

- Renamed script file to `gmail-middleclick.user.js` so userscript managers
  recognise and offer to install it.
- Completed the metadata block: added `@author`, `@license`, `@icon`,
  `@homepageURL`, `@supportURL`, `@updateURL`, `@downloadURL`; namespaced
  under the repo URL; narrowed `@match` to `https://mail.google.com/mail/*`;
  added `@noframes`; switched to `@run-at document-start`.
- Fixed thread URLs dropping the query/label context in search and nested
  label views.
- Stopped hijacking genuine links (attachment chips, RSVP links) inside a
  row on middle click.
- Added a `window.open` fallback for userscript managers that don't expose
  `GM_openInTab`.

### 2.0

- Initial release: open Gmail threads in background tabs via middle click.
