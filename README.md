# UserScripts

Custom user scripts for web annoyances.

## Scripts

| Script | Purpose | Install |
| --- | --- | --- |
| Gmail Middle Click → Background Tab | Middle-click a thread in the list to open it in a background tab, instead of triggering autoscroll. | [Install](https://raw.githubusercontent.com/seanbuckley/userscripts/master/gmail-middleclick/gmail-middleclick.user.js) |

## Installation

### Public Repository

1. Install [Violentmonkey](https://violentmonkey.github.io/) (or another userscript
   manager, such as Tampermonkey) in your browser.
2. Click a script's **Install** link above. Your userscript manager will recognise
   the `.user.js` file and offer to install it.

### Private Repository (Installing via Personal Access Token)

If loading from a private GitHub repository:

1. Create a **Personal Access Token (PAT)** on GitHub:
   - Go to GitHub **Settings ➔ Developer Settings ➔ Personal Access Tokens**.
   - Create a token with **Contents: Read-only** permission for this repository.
2. Open **Violentmonkey Dashboard** in your browser.
3. Click the **`+`** button in the top right and choose **Install from URL**.
4. Enter the Raw file URL with your token appended:
   ```text
   https://raw.githubusercontent.com/seanbuckley/userscripts/master/gmail-middleclick/gmail-middleclick.user.js?token=YOUR_PERSONAL_ACCESS_TOKEN
   ```
5. Click **Confirm Installation**.

Tested with Violentmonkey and Tampermonkey. Other managers should work, but
background-tab placement may differ — the tab-position hints used by the Gmail
script are manager-specific.

## Layout

One directory per script, named after the script. Each script file is named
`<name>.user.js` — the `.user.js` suffix is what lets a userscript manager
intercept the Raw URL and install it.

## Licence

[MIT](LICENSE)
