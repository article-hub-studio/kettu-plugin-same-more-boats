// Context menu expansion is handled in components.ts (real React patching of
// the menu builder). This module is kept for the feature toggle / Flux
// harvesting of guild+message ids that the menu may need.

import { before } from "@vendetta/patcher";
import { FluxDispatcher } from "@vendetta/metro/common";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

export function expandContextMenu(): () => void {
  const un: (() => void)[] = [];
  // Observe any action carrying message/channel context so the menu patch
  // can resolve ids when triggered.
  un.push(
    before("dispatch", FluxDispatcher, (args: any[]) => {
      try {
        const a = args?.[0];
        if (!a?.type) return;
        if (/MESSAGE|CHANNEL|CONTEXT/i.test(a.type)) {
          log("ctx observe:", a.type);
        }
      } catch {}
    })
  );
  log("contextMenu: observer active (render in components.ts)");
  return () => un.forEach((u) => { try { u(); } catch {} });
}
