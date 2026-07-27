// Unified, fail-soft notifier. Kettu is React Native — no DOM toasts.
// Use Discord's native toast API (metro.common.toasts.open) directly, which is
// confirmed present (TOAST_OPEN/TOAST_CLOSE actions are dispatched by it).
// Modal alert is reserved for important one-shot events.

import { toasts as metroToasts } from "@vendetta/metro/common";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
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

// Native Discord mobile toast via metro.common.toasts.open
function metroToast(msg: string) {
  try {
    const t = metroToasts as any;
    if (t && typeof t.open === "function") { t.open(msg, safeIcon()); return; }
    if (t && typeof t.showToast === "function") { t.showToast(msg, safeIcon()); return; }
  } catch (e) { log("metroToast FAIL", e); }
  // fallback: vendetta wrapper
  try { (vendettaToast as any)(msg, safeIcon()); } catch (e) { log("vendettaToast FAIL", e); }
}

let modalSuppressed = false;
export function suppressModal(v: boolean) { modalSuppressed = v; }

function modal(msg: string, kind: "ok" | "fail" = "ok") {
  if (modalSuppressed) return;
  try {
    (showConfirmationAlert as any)({
      title: "Same More Boats",
      content: msg,
      confirmText: "OK",
      isDismissable: true,
      onConfirm: () => {},
    });
  } catch (e) { log("modal FAIL", e); }
}

export function toast(msg: string) { metroToast(msg); }

export function notify(msg: string, kind: "ok" | "fail" = "ok") {
  metroToast(msg);
}
