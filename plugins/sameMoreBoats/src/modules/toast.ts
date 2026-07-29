import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { ReactNative } from "@vendetta/metro/common";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

function showModal(title: string, content: string) {
  // Method 1: React Native Alert (most reliable, always available)
  try {
    ReactNative.Alert.alert(
      title,
      content,
      [{ text: "OK" }],
      { cancelable: true },
    );
    return;
  } catch (e) {
    log("Alert.alert FAIL", e);
  }

  // Method 2: showConfirmationAlert (Vendetta/Kettu API)
  // NOTE: onConfirm is REQUIRED by the API — omitting it breaks the dialog
  try {
    showConfirmationAlert({
      title,
      content,
      confirmText: "OK",
      isDismissable: true,
      onConfirm: () => {},
      onCancel: () => {},
    });
    return;
  } catch (e) {
    log("showConfirmationAlert FAIL", e);
  }

  // Method 3: fallback to log
  log("MODAL:", title, "-", content);
}

export function showAlert(title: string, content: string) { showModal(title, content); }
export function toast(msg: string) { showModal("Same More Boats", msg); }
export function notify(msg: string, _kind: "ok" | "fail" = "ok") { toast(msg); }
export function suppressModal(_v: boolean) {}
