# Changelog

All notable changes to the scripts in this repo are documented here.

## gmail-middleclick

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
