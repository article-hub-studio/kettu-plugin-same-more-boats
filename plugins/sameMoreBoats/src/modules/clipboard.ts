const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

export function copyText(text: string): boolean {
  try {
    const common: any = require("@vendetta/metro/common");
    const c = common.clipboard;
    if (c && typeof c.setString === "function") { c.setString(text); return true; }
    if (c && typeof c.copy === "function") { c.copy(text); return true; }
    if (c?.default?.setString) { c.default.setString(text); return true; }
  } catch (e) { log("clipboard common FAIL", e); }

  try {
    const rn = require("@vendetta/metro/common").ReactNative;
    const rnClip = rn?.Clipboard || rn?.ExpoClipboard;
    if (rnClip?.setString) { rnClip.setString(text); return true; }
    if (rnClip?.setStringAsync) { rnClip.setStringAsync(text); return true; }
  } catch (e) { log("clipboard RN FAIL", e); }

  try {
    const metro: any = require("@vendetta/metro");
    const mod = metro.findByProps?.("setString", "getString");
    if (mod?.setString) { mod.setString(text); return true; }
  } catch (e) { log("clipboard metro FAIL", e); }

  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    el.remove();
    return true;
  } catch {}
  return false;
}
