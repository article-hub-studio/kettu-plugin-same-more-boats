import { clipboard } from "@vendetta/metro/common";
import { ReactNative } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

export function copyText(text: string): boolean {
  try {
    const c = clipboard as any;
    if (c && typeof c.setString === "function") { c.setString(text); return true; }
    if (c && typeof c.copy === "function") { c.copy(text); return true; }
    if (c?.default?.setString) { c.default.setString(text); return true; }
  } catch (e) { log("clipboard v1 FAIL", e); }

  try {
    const rnClip = (ReactNative as any).Clipboard;
    if (rnClip?.setString) { rnClip.setString(text); return true; }
    if (rnClip?.setStringAsync) { rnClip.setStringAsync(text); return true; }
  } catch (e) { log("clipboard RN FAIL", e); }

  try {
    const mod = findByProps("setString", "getString");
    if (mod?.setString) { mod.setString(text); return true; }
  } catch (e) { log("clipboard metro FAIL", e); }

  try {
    const mod = findByProps("Clipboard");
    if (mod?.Clipboard?.setString) { mod.Clipboard.setString(text); return true; }
  } catch {}

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
