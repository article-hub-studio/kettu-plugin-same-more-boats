// Same More Boats — PC feature parity for Discord mobile (Kettu/Vendetta/Revenge)
// Fail-soft loader. Settings persisted via MMKV storage, slash command /smb.

import { FluxDispatcher } from "@vendetta/metro/common";
import { before } from "@vendetta/patcher";

import { enableTags } from "./modules/tags";
import { enableForums } from "./modules/forums";
import { enableServerSettings } from "./modules/serverSettings";
import { enableGroupedMemberList } from "./modules/memberList";
import { expandContextMenu } from "./modules/contextMenu";
import { enableDevTools } from "./modules/devtools";
import { patchFeatureGates } from "./modules/featureGates";
import { injectStyles } from "./modules/styles";
import { notify, toast } from "./modules/toast";
import { runRecon } from "./modules/recon";
import { patchComponents } from "./modules/components";
import { initStorage, settings, DEFAULTS, openSettings, registerSmbCommand } from "./modules/settings";

export type { SMBSettings } from "./modules/settings";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

let patches: (() => void)[] = [];
let styleEl: HTMLStyleElement | null = null;
let loaded = false;
let unregCmd: (() => void) | null = null;

export default {
  onLoad() {
    if (loaded) { toast("Same More Boats already loaded"); return; }

    initStorage().then(() => {
      log("settings ready", JSON.stringify(settings));
    }).catch((e) => {
      log("storage FAIL", e);
    });

    const cfg = settings;
    let ok = 0;
    let fail = 0;

    const safe = (name: string, fn: () => (() => void) | void) => {
      try {
        const un = fn();
        if (typeof un === "function") patches.push(un);
        ok++;
        log("module ok:", name);
      } catch (e) {
        fail++;
        log("module FAIL:", name, e);
      }
    };

    safe("featureGates", () => patchFeatureGates(cfg));
    safe("styles", () => { styleEl = injectStyles(cfg); });
    if (cfg.tags) safe("tags", () => enableTags());
    if (cfg.forums) safe("forums", () => enableForums());
    if (cfg.serverSettings) safe("serverSettings", () => enableServerSettings());
    if (cfg.groupedMembers) safe("memberList", () => enableGroupedMemberList());
    if (cfg.contextMenu) safe("contextMenu", () => expandContextMenu());
    if (cfg.devTools) safe("devtools", () => enableDevTools());
    safe("components", () => patchComponents());

    try { unregCmd = registerSmbCommand(); } catch (e) { log("cmd reg fail", e); }

    loaded = true;
    log(`loaded: ${ok} ok, ${fail} failed`);
    notify(
      fail === 0
        ? "Same More Boats loaded — PC features on mobile"
        : `Same More Boats: ${ok} on, ${fail} skipped`,
      fail === 0 ? "ok" : "fail"
    );

    if (cfg.recon) {
      try { runRecon(); } catch (e) { log("recon FAIL", e); }
    }
  },

  onUnload() {
    patches.forEach((unpatch) => { try { unpatch(); } catch {} });
    patches = [];
    if (unregCmd) { try { unregCmd(); } catch {} unregCmd = null; }
    if (styleEl) { try { styleEl.remove(); } catch {} styleEl = null; }
    loaded = false;
    toast("Same More Boats unloaded");
  },
};
