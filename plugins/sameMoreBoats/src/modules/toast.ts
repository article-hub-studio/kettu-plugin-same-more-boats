import { ReactNative } from "@vendetta/metro/common";
import { showConfirmationAlert } from "@vendetta/ui/alerts";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

// Toast shows a modal instead of silent logging
export function toast(msg: string) {
  log("toast:", msg);
  try {
    ReactNative.Alert.alert(
      "Same More Boats",
      msg,
      [{ text: "OK" }],
      { cancelable: true },
    );
    return;
  } catch (e) {
    log("Alert.alert FAIL", e);
  }
  try {
    showConfirmationAlert({
      title: "Same More Boats",
      content: msg,
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

export function showAlert(title: string, content: string) {
  log("alert:", title, "-", content);
  try {
    ReactNative.Alert.alert(
      title || "Same More Boats",
      content || "",
      [{ text: "OK" }],
      { cancelable: true },
    );
    return;
  } catch (e) {
    log("Alert.alert FAIL", e);
  }
  try {
    showConfirmationAlert({
      title: title || "Same More Boats",
      content: content || "",
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
