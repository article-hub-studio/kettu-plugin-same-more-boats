// Native RN clipboard helper — no DOM needed.
import { clipboard } from "@vendetta/metro/common";

export function copyText(text: string): boolean {
  try {
    (clipboard as any).setString?.(text);
    return true;
  } catch {}
  try {
    // some builds expose default
    (clipboard as any)?.default?.setString?.(text);
    return true;
  } catch {}
  // last resort: DOM (works only on web/webview)
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
