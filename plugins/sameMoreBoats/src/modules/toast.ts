// Toast notifications, mirroring desktop behaviour: a small transient popup
// near the bottom of the screen instead of a blocking Alert.

import { ReactNative } from "@vendetta/metro/common";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { log } from "./utils";

// Vendetta's showToast is loaded lazily in some Kettu builds; resolve it via
// metro and cache the result.
import { findByProps } from "@vendetta/metro";

let _showToast: ((content: string, asset?: number) => void) | null = null;
let _showToastResolved = false;

function resolveShowToast() {
  if (_showToastResolved) return _showToast;
  _showToastResolved = true;
  try {
    const mod = findByProps("showToast");
    if (typeof mod?.showToast === "function") { _showToast = mod.showToast.bind(mod); }
  } catch {}
  return _showToast;
}

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

function fallbackAlert(title: string, msg: string) {
  try {
    ReactNative.Alert.alert(title, msg, [{ text: "OK" }], { cancelable: true });
    return true;
  } catch {}
  try {
    showConfirmationAlert({
      title,
      content: msg,
      confirmText: "OK",
      isDismissable: true,
      onConfirm: () => {},
      onCancel: () => {},
    });
    return true;
  } catch {}
  return false;
}

/** Non-blocking toast. Falls back to a compact alert when the native toast
 * surface isn't available on this build. */
export function toast(msg: string) {
  log("toast:", msg);
  try {
    const st = resolveShowToast();
    if (st) { st(msg, checkAsset()); return; }
  } catch (e) { log("showToast FAIL", e); }
  if (!fallbackAlert("Same More Boats", msg)) log("toast dropped:", msg);
}

/** Deliberately blocking dialog, for cases where the user must read something
 * (e.g. /smb output). Prefer toast() for routine confirmations. */
export function showAlert(title: string, content: string) {
  log("alert:", title, "-", content);
  if (!fallbackAlert(title || "Same More Boats", content || "")) log("alert dropped:", title);
}

export function notify(msg: string, _kind: "ok" | "fail" = "ok") {
  toast(msg);
}
