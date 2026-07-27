// DevTools: Flux inspector overlay. Kettu is React Native — no DOM, so the
// previous DOM overlay never rendered. We instead use a native modal alert that
// lists the most recent action types. Trigger: re-load plugin with devTools on.
// (Future: wire to a long-press gesture via metro components — needs more work.)

import { before } from "@vendetta/patcher";
import { FluxDispatcher } from "@vendetta/metro/common";
import { showConfirmationAlert } from "@vendetta/ui/alerts";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

export function enableDevTools(): () => void {
  const unpatches: (() => void)[] = [];
  let buffer: string[] = [];

  unpatches.push(
    before("dispatch", FluxDispatcher, (args: any[]) => {
      const a = args?.[0];
      if (a?.type) {
        buffer.push(a.type);
        if (buffer.length > 100) buffer.shift();
      }
    })
  );

  // After 4s, dump captured types to a native modal for the user to screenshot.
  setTimeout(() => {
    try {
      const txt = buffer.length ? buffer.slice(-60).join("\n") : "(none captured)";
      (showConfirmationAlert as any)({
        title: `SMB devtools — last ${Math.min(60, buffer.length)} actions`,
        content: txt,
        confirmText: "OK",
        isDismissable: true,
        onConfirm: () => {},
      });
    } catch (e) { log("devtools modal FAIL", e); }
  }, 4000);

  return () => unpatches.forEach((u) => { try { u(); } catch {} });
}
