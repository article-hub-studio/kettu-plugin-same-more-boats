# Liquid Glass for Kettu

A balanced translucent makeover for Discord on Kettu. It rounds and layers the chat composer, channel rows, section cards, and compact buttons while keeping text readable.

## Build

```sh
npm install
npm run build
```

Host `dist/liquid-glass/` on a static HTTPS site, then add the URL ending in `/manifest.json` from Kettu's plugin page.

## Notes

Kettu and Discord frequently rename internal React Native components. Liquid Glass discovers likely surfaces by their component and accessibility names, and skips unknown components safely. Restart the plugin after Discord updates if a surface does not restyle immediately.

---

# Same More Boats

Brings PC-only Discord UI to mobile. Modular, with functions in `plugins/sameMoreBoats/src/modules/`:

- `authorTags.ts` — renders BOT/STAFF/role pills next to message authors.
- `actionSheet.ts` — hooks `ActionSheet.openLazy` and injects extra rows into message/user menus.
- `menuItems.ts` — builds additions: Copy ID / Message Link / Raw / User ID / Username / Avatar URL / Account Created Date / Message JSON / Channel ID / Guild ID.
- `developerMode.ts` — forces Developer Mode on (unlocks native "Copy ID" etc.).
- `featureGates.ts` — adds desktop-style feature flags to guild payloads.
- `devtools.ts` + `devtools WS` — Flux action logger + connect to React DevTools via `/smb connect ws://...`.
- `context.ts` — shared state: tracked message context + per-guild role cache.
- `injectors.ts` / `utils.ts` — building blocks for row injection, icon/asset resolution, diagnostics.
- `diagnostics.ts` — data behind the `/smb status` / `/smb scan` / `/smb shape` / `/smb keys` commands.
- `tags / forums / serverSettings / memberList` — optional feature toggles, off by default, flagged as experimental: they only unlock local UI; the server can still reject the corresponding actions.

Debug from chat: `/smb status`, `/smb scan`, `/smb shape`, `/smb keys`, `/smb reset`.

