# Changelog

All notable changes to the scripts in this repo are documented here.

## gmail-middleclick

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
