import { clipboard, ReactNative, metro } from "@vendetta/metro/common";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

export function copyText(text: string): boolean {
  try {
    const c = clipboard as any;
    if (c && typeof c.setString === "function") { c.setString(text); return true; }
    if (c && typeof c.copy === "function") { c.copy(text); return true; }
    if (c?.default?.setString) { c.default.setString(text); return true; }
  } catch (e) { log("clipboard common FAIL", e); }

  try {
    const rn = ReactNative as any;
    const rnClip = rn?.Clipboard || rn?.ExpoClipboard;
    if (rnClip?.setString) { rnClip.setString(text); return true; }
    if (rnClip?.setStringAsync) { rnClip.setStringAsync(text); return true; }
  } catch (e) { log("clipboard RN FAIL", e); }

  try {
    const m = metro as any;
    const mod = m?.findByProps?.("setString", "getString");
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
