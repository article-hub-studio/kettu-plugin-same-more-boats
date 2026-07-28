import { FluxDispatcher } from "@vendetta/metro/common";

import { initStorage, settings, DEFAULTS, registerSmbCommand } from "./modules/settings";
import { toast } from "./modules/toast";

export type { SMBSettings } from "./modules/settings";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

let patches: (() => void)[] = [];
let styleEl: any = null;
let loaded = false;
let unregCmd: (() => void) | null = null;

function loadModule(name: string, loader: () => Promise<any>) {
  return loader()
    .then((mod: any) => {
      try {
        const init = mod?.default ?? mod?.onLoad ?? mod?.init;
        if (typeof init === "function") {
          const un = init(settings);
          if (typeof un === "function") patches.push(un);
        } else if (typeof mod?.patchFeatureGates === "function") {
          const un = mod.patchFeatureGates(settings);
          if (typeof un === "function") patches.push(un);
        }
        log("module loaded:", name);
      } catch (e) {
        log("module init FAIL:", name, e);
      }
    })
    .catch((e: any) => {
      log("module import FAIL:", name, e);
    });
}

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

        safe("featureGates", () => {
          const { patchFeatureGates } = require("./modules/featureGates");
          return patchFeatureGates(cfg);
        });
        safe("components", () => {
          const { patchComponents } = require("./modules/components");
          return patchComponents();
        });
        if (cfg.tags) safe("tags", () => {
          const { enableTags } = require("./modules/tags");
          return enableTags();
        });
        if (cfg.forums) safe("forums", () => {
          const { enableForums } = require("./modules/forums");
          return enableForums();
        });
        if (cfg.serverSettings) safe("serverSettings", () => {
          const { enableServerSettings } = require("./modules/serverSettings");
          return enableServerSettings();
        });
        if (cfg.groupedMembers) safe("memberList", () => {
          const { enableGroupedMemberList } = require("./modules/memberList");
          return enableGroupedMemberList();
        });
        if (cfg.contextMenu) safe("contextMenu", () => {
          const { expandContextMenu } = require("./modules/contextMenu");
          return expandContextMenu();
        });
        if (cfg.devTools) safe("devtools", () => {
          const { enableDevTools } = require("./modules/devtools");
          return enableDevTools();
        });
        safe("styles", () => {
          const { injectStyles } = require("./modules/styles");
          styleEl = injectStyles(cfg);
        });

        try { unregCmd = registerSmbCommand(); } catch (e) { log("cmd reg fail", e); }

        toast("Same More Boats loaded ✓");
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
