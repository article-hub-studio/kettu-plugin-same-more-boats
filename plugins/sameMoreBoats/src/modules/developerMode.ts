// Forces Discord's DeveloperModeStore to report developer mode ON, which
// unlocks desktop-style affordances such as "Copy ID" in native menus.

import { findByStoreName } from "@vendetta/metro";
import { log, safeFind } from "./utils";

type Unpatch = () => void;

export function patchDeveloperMode(): Unpatch | void {
  try {
    const store = safeFind("DeveloperModeStore", () => findByStoreName("DeveloperModeStore"));
    if (!store) { log("DeveloperModeStore not found"); return; }
    const orig = store.getDeveloperMode?.bind(store);
    if (typeof orig !== "function") { log("getDeveloperMode not a function"); return; }
    store.getDeveloperMode = () => true;
    log("DeveloperMode forced ON");
    return () => { try { store.getDeveloperMode = orig; } catch {} };
  } catch (e) { log("patchDeveloperMode FAIL", e); }
}
