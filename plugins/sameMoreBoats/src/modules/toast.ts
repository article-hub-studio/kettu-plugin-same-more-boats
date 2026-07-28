const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

export function toast(msg: string) {
  try { console.log("[SMB toast]", msg); } catch {}
  try {
    const metroMod: any = require("@vendetta/metro/common");
    const t = metroMod.toasts;
    if (t && typeof t.open === "function") { t.open(msg, undefined); return; }
    if (t && typeof t.showToast === "function") { t.showToast(msg, undefined); return; }
  } catch (e) { log("metroToast FAIL", e); }
  try {
    const uiToasts: any = require("@vendetta/ui/toasts");
    const showToast = uiToasts.showToast || uiToasts.default?.showToast;
    let iconId: any;
    try {
      const assets: any = require("@vendetta/ui/assets");
      if (assets.getAssetIDByName) {
        for (const n of ["ic_desktop_24px", "ic_information_24px", "ic_settings_24px"]) {
          const id = assets.getAssetIDByName(n);
          if (id) { iconId = id; break; }
        }
      }
    } catch {}
    if (showToast) { showToast(msg, iconId); return; }
  } catch (e) { log("uiToast FAIL", e); }
}

export function notify(msg: string, _kind: "ok" | "fail" = "ok") { toast(msg); }
export function suppressModal(_v: boolean) {}
