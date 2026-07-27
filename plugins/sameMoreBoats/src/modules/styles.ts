// Inject CSS for desktop-only UI bits. NOTE: Kettu is React Native — most
// styling is done via StyleSheet, not DOM CSS. This only affects any webview /
// HTML-rendered surfaces (e.g. forum thread cards rendered via web). On pure RN
// this is a no-op, kept for safety.

import type { SMBSettings } from "../index";

export function injectStyles(cfg: SMBSettings): HTMLStyleElement | null {
  try {
    const el = document.createElement("style");
    el.setAttribute("data-smb", "true");
    el.textContent = `
      [class*="roleTag"], [class*="botTag"] { display: inline-flex !important; }
      [class*="authorTag"] { display: inline-flex !important; margin-left: 4px; }
      [class*="forumChannelList"] { overflow-x: auto !important; flex-direction: row !important; }
      [class*="forumThreadCard"] { min-width: 280px !important; }
      [class*="guildSettingsSidebar"] { display: flex !important; }
      [class*="memberListGroup"] { display: flex !important; flex-direction: column !important; }
      ${cfg.forceDesktopLayout ? `
      body { font-size: 14px !important; }
      [class*="sidebar"] { width: 240px !important; }
      ` : ""}
    `;
    document.head?.appendChild?.(el);
    return el;
  } catch {
    return null;
  }
}
