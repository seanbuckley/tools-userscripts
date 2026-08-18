# Changelog

All notable changes to the scripts in this repo are documented here.

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
