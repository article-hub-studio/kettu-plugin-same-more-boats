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
# Plugins-Vandetta-
# Plugins-Vandetta-
