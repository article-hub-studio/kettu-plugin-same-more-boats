import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { ReactNative } from "@vendetta/metro/common";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

// Toast is silent — just log to console
// The user requested: "Hiện nothing" (show nothing) for toasts
export function toast(msg: string) {
  log("toast:", msg);
}

// showAlert still shows a modal for important messages
export function showAlert(title: string, content: string) {
  log("alert:", title, "-", content);
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
}

export function notify(msg: string, _kind: "ok" | "fail" = "ok") {
  log("notify:", msg);
}
export function suppressModal(_v: boolean) {}
