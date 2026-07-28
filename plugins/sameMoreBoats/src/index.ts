import { initStorage, settings, registerSmbCommand } from "./modules/settings";
import { toast, showAlert } from "./modules/toast";
import { patchFeatureGates } from "./modules/featureGates";
import { patchComponents } from "./modules/components";
import { enableTags } from "./modules/tags";
import { enableForums } from "./modules/forums";
import { enableServerSettings } from "./modules/serverSettings";
import { enableGroupedMemberList } from "./modules/memberList";
import { expandContextMenu } from "./modules/contextMenu";
import { enableDevTools } from "./modules/devtools";
import { injectStyles } from "./modules/styles";

export type { SMBSettings } from "./modules/settings";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

let patches: (() => void)[] = [];
let styleEl: any = null;
let loaded = false;
let unregCmd: (() => void) | null = null;

export default {
  onLoad() {
    if (loaded) { toast("Same More Boats already loaded"); return; }
    loaded = true;

    log("onLoad starting");

    initStorage()
      .then(() => {
        log("settings ready", JSON.stringify(settings));
        const cfg = settings;

        const safe = (name: string, fn: () => any) => {
          try {
            const un = fn();
            if (typeof un === "function") patches.push(un);
            log("ok:", name);
          } catch (e) {
            log("FAIL:", name, e);
          }
        };

        safe("featureGates", () => patchFeatureGates(cfg));
        safe("components", () => patchComponents());
        if (cfg.tags) safe("tags", () => enableTags());
        if (cfg.forums) safe("forums", () => enableForums());
        if (cfg.serverSettings) safe("serverSettings", () => enableServerSettings());
        if (cfg.groupedMembers) safe("memberList", () => enableGroupedMemberList());
        if (cfg.contextMenu) safe("contextMenu", () => expandContextMenu());
        if (cfg.devTools) safe("devtools", () => enableDevTools());
        safe("styles", () => { styleEl = injectStyles(cfg); });

        try { unregCmd = registerSmbCommand(); } catch (e) { log("cmd reg fail", e); }

        // Show a nice startup modal
        const features: string[] = [];
        if (cfg.tags) features.push("Tags");
        if (cfg.forums) features.push("Forums");
        if (cfg.serverSettings) features.push("Server Settings");
        if (cfg.groupedMembers) features.push("Grouped Members");
        if (cfg.contextMenu) features.push("Context Menu");
        if (cfg.devTools) features.push("DevTools");
        const featStr = features.length > 0
          ? "Features: " + features.join(", ")
          : "All features are disabled";
        showAlert("Same More Boats", "Loaded successfully ✓\n" + featStr);
      })
      .catch((e: any) => {
        log("initStorage chain FAIL", e);
        toast("Same More Boats loaded (defaults)");
      });
  },

  onUnload() {
    patches.forEach((unpatch) => { try { unpatch(); } catch {} });
    patches = [];
    if (unregCmd) { try { unregCmd(); } catch {} unregCmd = null; }
    if (styleEl) { try { styleEl.remove?.(); } catch {} styleEl = null; }
    loaded = false;
    toast("Same More Boats unloaded");
  },
};
