import { toasts as metroToasts } from "@vendetta/metro/common";
import { showToast as vendettaToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

function safeIcon(): any {
  const ids = ["ic_desktop_24px", "ic_settings_24px", "ic_compose_24px", "ic_emoji_24px", "ic_information_24px"];
  for (const n of ids) {
    try { const i = getAssetIDByName(n); if (i) return i; } catch {}
  }
  return undefined;
}

function metroToast(msg: string) {
  try {
    const t = metroToasts as any;
    if (t && typeof t.open === "function") { t.open(msg, safeIcon()); return; }
    if (t && typeof t.showToast === "function") { t.showToast(msg, safeIcon()); return; }
  } catch (e) { log("metroToast FAIL", e); }
  try { (vendettaToast as any)(msg, safeIcon()); } catch (e) { log("vendettaToast FAIL", e); }
}

export function toast(msg: string) { metroToast(msg); }
export function notify(msg: string, _kind: "ok" | "fail" = "ok") { metroToast(msg); }
export function suppressModal(_v: boolean) {}
