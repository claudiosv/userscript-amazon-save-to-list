# Amazon Saved to List Auto-Adder

A userscript that bulk-adds all your Amazon "Saved for later" items to a wishlist or list in one click.

## Features

- Adds every "Saved for later" item to your default list automatically
- Handles the add-to-list popover when Amazon shows it
- Detects Amazon's SPA/AJAX refreshes and adapts accordingly
- Lazy-loads more items by scrolling if your cart has many saved items
- Optional: delete items from "Saved for later" after adding them
- Works across all Amazon storefronts (.com, .co.uk, .de, .co.jp, and [more](#supported-storefronts))

## Installation

**Via Greasy Fork** *(recommended)*: [Install from Greasy Fork](https://greasyfork.org/en/users/1612906-claudios)

**Direct install**: [save-to-list.user.js](https://github.com/claudiosv/userscript-amazon-save-to-list/releases/latest/download/save-to-list.user.js)

Requires [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://addons.mozilla.org/firefox/addon/greasemonkey/).

## Usage

1. Go to your Amazon cart (`amazon.com/cart`)
2. Scroll down to the "Saved for later" section
3. A panel appears in the bottom-right corner of the page
4. Optionally check **"Delete from Saved after adding"** to clean up as it goes
5. Click **"Add Saved Items to List"**

The script processes items one by one, showing progress in the button. When done, it reports how many were added and deleted.

## Supported Storefronts

North America: `.com` `.ca` `.com.mx`  
Europe: `.co.uk` `.de` `.fr` `.it` `.es` `.nl` `.se` `.pl` `.com.be`  
Asia & Pacific: `.co.jp` `.in` `.com.au` `.sg`  
Middle East & Africa: `.ae` `.sa` `.eg` `.com.tr` `.co.za`  
South America: `.com.br`

## Development

```sh
pnpm install
pnpm build        # compiles src/save-to-list.ts → dist/save-to-list.user.js
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm format       # prettier --write
```

### Releasing

```sh
pnpm release [patch|minor|major]
```

This bumps the version in `package.json`, commits, tags, and pushes. GitHub Actions then builds the script and publishes it as a release asset. Greasy Fork syncs automatically via the GitHub webhook.
