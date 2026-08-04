// Toast notifications driven by Vendetta's design system: a small transient
// popup near the bottom of the screen instead of a blocking Alert.

import { showToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { log } from "./utils";

let _checkAsset: number | undefined;
function checkAsset(): number | undefined {
  if (_checkAsset !== undefined) return _checkAsset;
  const names = ["ic_check", "CheckmarkSmallIcon", "CheckIcon", "ic_check_24px", "CircleCheckIcon-primary"];
  for (const n of names) {
    try {
      const id = getAssetIDByName?.(n);
      if (typeof id === "number" && id > 0) { _checkAsset = id; return id; }
    } catch {}
  }
  _checkAsset = undefined;
  return undefined;
}

/** Non-blocking toast via `@vendetta/ui/toasts`. */
export function toast(msg: string) {
  log("toast:", msg);
  try {
    showToast(msg, checkAsset());
  } catch (e) {
    log("showToast FAIL", e);
  }
}

/** Non-blocking notification. */
export function showAlert(title: string, content: string) {
  log("alert:", title, "-", content);
  toast((title ? title + ": " : "") + (content || ""));
}

export function notify(msg: string, _kind: "ok" | "fail" = "ok") {
  toast(msg);
}