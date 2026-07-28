import { showToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { toasts } from "@vendetta/metro/common";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

export function toast(msg: string) {
  try { console.log("[SMB toast]", msg); } catch {}

  // Try Vendetta UI toast first (most reliable)
  try {
    let iconId: any;
    try {
      iconId = getAssetIDByName("ic_check_24px") || getAssetIDByName("ic_desktop_24px");
    } catch {}
    if (showToast) { showToast(msg, iconId); return; }
  } catch (e) { log("uiToast FAIL", e); }

  // Fallback: Discord native toasts
  try {
    if (toasts?.open?.apply) {
      toasts.open(msg);
      return;
    }
  } catch (e) { log("metroToast FAIL", e); }
}

export function notify(msg: string, _kind: "ok" | "fail" = "ok") { toast(msg); }
export function suppressModal(_v: boolean) {}
