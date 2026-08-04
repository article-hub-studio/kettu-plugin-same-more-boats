import { initStorage, settings, registerSmbCommand } from "./modules/settings";
import { toast } from "./modules/toast";
import { patchFeatureGates } from "./modules/featureGates";
import { patchMessageAuthor } from "./modules/authorTags";
import { patchContextMenuItems } from "./modules/actionSheet";
import { patchDeveloperMode } from "./modules/developerMode";
import { enableTags } from "./modules/tags";
import { enableForums } from "./modules/forums";
import { enableServerSettings } from "./modules/serverSettings";
import { enableGroupedMemberList } from "./modules/memberList";
import { expandContextMenu } from "./modules/contextMenu";
import { enableDevTools } from "./modules/devtools";
import { injectStyles } from "./modules/styles";
import { enableRoleTracking } from "./modules/roleTracker";

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
        if (cfg.tags) safe("authorTags", () => patchMessageAuthor());
        if (cfg.contextMenu) safe("actionSheet", () => patchContextMenuItems());
        if (cfg.devTools) safe("developerMode", () => patchDeveloperMode());
        if (cfg.tags) safe("tags", () => enableTags());
        if (cfg.forums) safe("forums", () => enableForums());
        if (cfg.serverSettings) safe("serverSettings", () => enableServerSettings());
        if (cfg.groupedMembers) safe("memberList", () => enableGroupedMemberList());
        if (cfg.contextMenu) safe("contextMenu", () => expandContextMenu());
        if (cfg.devTools) safe("devtools", () => enableDevTools());
        safe("styles", () => { styleEl = injectStyles(cfg); });
        safe("roleTracker", () => enableRoleTracking());

        try { unregCmd = registerSmbCommand(); } catch (e) { log("cmd reg fail", e); }

        log("Loaded successfully");
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
