// Diagnostics surfaced through the /smb slash command: which metro modules /
// stores / components were found on this build, plus the deep context-menu
// module scan. Pure read-only inspection; safe to run any time.

import {
  find,
  findByProps,
  findByName,
  findByStoreName,
} from "@vendetta/metro";
import { getTrackedCtx } from "./context";
import { findNameplateComponents } from "./authorTags";

function diagnostics(): string[] {
  const out: string[] = [];
  const checks: [string, () => any][] = [
    ["nameplate.comps", () => findNameplateComponents().length],
    ["ctxMenu.builder", () => findByProps("buildMessageContextMenuItems")],
    ["ctxMenu.items", () => findByProps("menuItems")],
    ["ctxMenu.open", () => findByProps("openContextMenu")],
    ["ctxMenu.container", () => findByProps("ContextMenuContainer")],
    ["ctxMenu.showCtxMenu", () => findByProps("showContextMenu")],
    ["ctxMenu.showActionSheet", () => findByProps("showActionSheet")],
    ["ctxMenu.updCtxState", () => findByProps("updateContextMenuState")],
    ["ctxMenu.bottomSheet", () => findByProps("BottomSheet")],
    ["ctxMenu.openLazy", () => findByProps("openLazy", "hideActionSheet")],
    ["ctxMenu.actionSheetRow", () => findByProps("ActionSheetRow")],
    ["ctxMenu.userProfileSheet", () => findByName("showUserProfileActionSheet", false)],
    ["nameplate", () => findByName("Nameplate", false)],
    ["nameplateInner", () => findByName("NameplateInner", false)],
    ["username", () => findByName("Username", false)],
    ["botTag", () => findByName("BotTag", false)],
    ["GuildStore", () => findByStoreName("GuildStore")],
    ["GuildMemberStore", () => findByStoreName("GuildMemberStore")],
    ["RoleStore", () => findByStoreName("RoleStore")],
    ["DeveloperModeStore", () => findByStoreName("DeveloperModeStore")],
    ["clipboard", () => findByProps("setString")],
    ["trackedCtx", () => { const t = getTrackedCtx(); return t.message?.id ? "hasMsg" : t.user?.id ? "hasUser" : t.channelId ? "hasChan" : "empty" }],
  ];
  for (const [label, fn] of checks) {
    try {
      const r = fn();
      out.push(`${label}: ${r ? "FOUND" : "miss"}`);
    } catch {
      out.push(`${label}: ERR`);
    }
  }
  return out;
}

export function getDiagnostics(): string[] {
  return diagnostics();
}

// Deep scan: find ALL modules with context-menu related properties.
function findCtxModules(): [string, any][] {
  const results: [string, any][] = [];
  const seen = new Set<any>();

  // Check specific property names used across Discord builds
  const props = [
    "openContextMenu", "closeContextMenu", "showContextMenu",
    "contextMenuActions", "buildMessageContextMenuItems",
    "buildContextMenuItems", "getContextMenuItems",
    "getMessageContextMenuItems", "getMenuItems",
    "buildMenuItems", "createContextMenu",
    "MessageContextMenu", "ContextMenuContainer",
    "ContextMenu", "ActionSheet", "ActionSheetPresenter",
    "BottomSheet", "menuItems", "contextMenu",
    "showActionSheet", "dismissActionSheet",
    "getLongPressItems", "getMessageMenuItems",
    "getBuiltMenuItems", "buildMessageMenu",
    "getActionsForMessage", "getMenuForMessage",
    "getRows", "getSections",
  ];

  for (const p of props) {
    try {
      const mod = findByProps(p);
      if (mod && !seen.has(mod)) {
        seen.add(mod);
        // Find all function names in this module
        const fns: string[] = [];
        for (const k of Object.keys(mod)) {
          if (typeof mod[k] === "function") fns.push(k);
        }
        results.push([p, { moduleKeys: Object.keys(mod).slice(0, 20), functions: fns.slice(0, 15) }]);
      }
    } catch {}
  }

  return results;
}

export function getCtxModuleScan(): string[] {
  const out: string[] = [];
  const modules = findCtxModules();
  out.push(`Found ${modules.length} context-menu related modules:`);
  for (const [prop, info] of modules) {
    out.push(`  via "${prop}": keys=[${info.moduleKeys.join(", ")}]`);
    if (info.functions.length) {
      out.push(`    fns=[${info.functions.join(", ")}]`);
    }
  }
  return out;
}
