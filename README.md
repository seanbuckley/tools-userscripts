# UserScripts

Custom user scripts for web annoyances.

## Scripts

| Script | Purpose | Install |
| --- | --- | --- |
| Gmail Middle Click → Background Tab | Middle-click a thread in the list to open it in a background tab, instead of triggering autoscroll. | [Install](https://raw.githubusercontent.com/seanbuckley/userscripts/master/gmail-middleclick/gmail-middleclick.user.js) |

## Installation

1. Install [Violentmonkey](https://violentmonkey.github.io/) (or another userscript
   manager, such as Tampermonkey) in your browser.
2. Click a script's **Install** link above. Your userscript manager will recognise
   the `.user.js` file and offer to install it.

Tested with Violentmonkey and Tampermonkey. Other managers should work, but
background-tab placement may differ — the tab-position hints used by the Gmail
script are manager-specific.

## Layout

One directory per script, named after the script. Each script file is named
`<name>.user.js` — the `.user.js` suffix is what lets a userscript manager
intercept the Raw URL and install it.

## Licence

[MIT](LICENSE)
