import { showConfirmationAlert } from "@vendetta/ui/alerts";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

export function showAlert(title: string, content: string) {
  try {
    showConfirmationAlert({
      title: title,
      content: content,
      confirmText: "OK",
      isDismissable: true,
    });
  } catch (e) {
    log("showAlert FAIL", e);
  }
}

export function toast(msg: string) {
  try {
    showConfirmationAlert({
      title: "Same More Boats",
      content: msg,
      confirmText: "OK",
      isDismissable: true,
    });
  } catch (e) { log("toast FAIL", e); }
}

export function notify(msg: string, _kind: "ok" | "fail" = "ok") { toast(msg); }
export function suppressModal(_v: boolean) {}
