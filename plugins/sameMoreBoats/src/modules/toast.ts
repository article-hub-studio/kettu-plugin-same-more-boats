import { toasts } from "@vendetta/metro/common";
import { showToast as uiShowToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

export function toast(msg: string) {
  try { console.log("[SMB toast]", msg); } catch {}
  try {
    if (toasts && typeof toasts.open === "function") { toasts.open(msg, undefined); return; }
    if (toasts && typeof toasts.showToast === "function") { toasts.showToast(msg, undefined); return; }
  } catch (e) { log("metroToast FAIL", e); }
  try {
    const showToast = uiShowToast;
    let iconId: any;
    try {
      if (getAssetIDByName) {
        for (const n of ["ic_desktop_24px", "ic_information_24px", "ic_settings_24px"]) {
          const id = getAssetIDByName(n);
          if (id) { iconId = id; break; }
        }
      }
    } catch {}
    if (showToast) { showToast(msg, iconId); return; }
  } catch (e) { log("uiToast FAIL", e); }
}

export function notify(msg: string, _kind: "ok" | "fail" = "ok") { toast(msg); }
export function suppressModal(_v: boolean) {}
