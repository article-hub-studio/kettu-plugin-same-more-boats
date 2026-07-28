import { toasts } from "@vendetta/metro/common";
import { showToast as uiShowToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

export function toast(msg: string) {
  try { console.log("[SMB toast]", msg); } catch {}

  // Try Discord's native toast API first
  try {
    if (toasts?.open && typeof toasts.open === "function") {
      toasts.open(msg);
      return;
    }
  } catch (e) { log("native toasts.open FAIL", e); }

  // Try alternative native API
  try {
    if (toasts?.showToast && typeof toasts.showToast === "function") {
      toasts.showToast(msg);
      return;
    }
  } catch (e) { log("native toasts.showToast FAIL", e); }

  // Try Vendetta UI toast as last resort
  try {
    if (uiShowToast) {
      let iconId: any;
      try {
        iconId = getAssetIDByName("ic_check_24px") || getAssetIDByName("ic_desktop_24px");
      } catch {}
      uiShowToast(msg, iconId);
    }
  } catch (e) { log("uiShowToast FAIL", e); }
}

export function notify(msg: string, _kind: "ok" | "fail" = "ok") { toast(msg); }
export function suppressModal(_v: boolean) {}
