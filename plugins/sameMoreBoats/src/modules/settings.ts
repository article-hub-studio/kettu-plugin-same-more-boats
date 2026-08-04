import { createMMKVBackend, createStorage, wrapSync } from "@vendetta/storage";
import { registerCommand } from "@vendetta/commands";
import { ApplicationCommandInputType, ApplicationCommandType } from "@vendetta/constants";
import { connectToDebugger } from "@vendetta/debug";
import { getDiagnostics, getCtxModuleScan } from "./diagnostics";
import { resetTrackedCtx } from "./context";
import { getItemShape, getSeenLazyKeys } from "./injectors";
import { pickRoleForIcon, openRoleIconEditor } from "./roleIcons";
import { setRoleIcon } from "./discordApi";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

export type SMBSettings = {
  tags: boolean;
  forums: boolean;
  serverSettings: boolean;
  groupedMembers: boolean;
  contextMenu: boolean;
  devTools: boolean;
  forceDesktopLayout: boolean;
  recon: boolean;
  devtoolsUrl: string;
  roleIcons: boolean;
};

export const DEFAULTS: SMBSettings = {
  tags: true,
  forums: false,
  serverSettings: false,
  groupedMembers: false,
  contextMenu: true,
  devTools: true,
  forceDesktopLayout: false,
  recon: false,
  devtoolsUrl: "",
  roleIcons: true,
};

export let settings: SMBSettings = { ...DEFAULTS };

let storagePromise: Promise<void> | null = null;

export async function initStorage(): Promise<void> {
  if (storagePromise) return storagePromise;
  storagePromise = (async () => {
    try {
      if (!createMMKVBackend || !createStorage || !wrapSync) {
        log("storage: missing exports, using defaults");
        return;
      }
      const backend = createMMKVBackend("SMBSettings");
      const store = await createStorage<SMBSettings>(backend);
      const sync = wrapSync(store);
      settings = sync;
      for (const k of Object.keys(DEFAULTS) as (keyof SMBSettings)[]) {
        if (settings[k] === undefined || settings[k] === null) {
          settings[k] = DEFAULTS[k] as any;
        }
      }
      log("storage init ok", JSON.stringify(settings));
    } catch (e) {
      log("storage init FAIL", e);
    }
  })();
  return storagePromise;
}

let unregCmd: (() => void) | null = null;

export function registerSmbCommand(): () => void {
  if (unregCmd) return () => { if (unregCmd) { try { unregCmd(); } catch {} unregCmd = null; } };
  try {
    if (!registerCommand) {
      log("registerCommand not found");
      return () => {};
    }
    unregCmd = registerCommand({
      name: "smb",
      displayName: "smb",
      description: "Same More Boats",
      displayDescription: "Same More Boats",
      inputType: ApplicationCommandInputType?.BUILT_IN ?? 0,
      type: ApplicationCommandType?.CHAT ?? 1,
      applicationId: "-1",
      options: [
        {
          name: "action",
          displayName: "action",
          description: "connect / url / status / scan / shape / keys / reset / roleicon",
          displayDescription: "connect / url / status / scan / shape / keys / reset / roleicon",
          type: 3,
          required: false,
        },
        {
          name: "url",
          displayName: "url",
          description: "DevTools WebSocket URL",
          displayDescription: "DevTools WebSocket URL",
          type: 3,
          required: false,
        },
        {
          name: "role",
          displayName: "role",
          description: "Role to edit (roleicon)",
          displayDescription: "Role to edit (roleicon)",
          type: 8,
          required: false,
        },
        {
          name: "icon",
          displayName: "icon",
          description: "Emoji to set as the role icon (optional)",
          displayDescription: "Emoji to set as the role icon (optional)",
          type: 3,
          required: false,
        },
      ],
      execute: async (args: any[], _ctx: any) => {
        try {
          const action = args?.find((a) => a.name === "action")?.value;
          const url = args?.find((a) => a.name === "url")?.value;
          const role = args?.find((a) => a.name === "role")?.value;
          const icon = args?.find((a) => a.name === "icon")?.value;
          const guildId = _ctx?.guild?.id;
          if (action === "connect") {
            const u = url || settings.devtoolsUrl;
            if (!u) return { content: "No URL set. Use `/smb url <ws://...>`" };
            settings.devtoolsUrl = u;
            try {
              if (connectToDebugger) connectToDebugger(u);
            } catch (e) { log("connect fail", e); }
            return { content: "Connecting to DevTools at " + u };
          }
          if (action === "url") {
            if (!url) return { content: "Usage: `/smb url ws://192.168.x.x:8097`" };
            settings.devtoolsUrl = url;
            return { content: "DevTools URL saved: " + url };
          }
          if (action === "status") {
            const lines: string[] = [];
            try {
              if (getDiagnostics) lines.push(...getDiagnostics());
            } catch {}
            lines.push("");
            lines.push("DevTools URL: " + (settings.devtoolsUrl || "(none)"));
            return { content: lines.join("\n") };
          }
          if (action === "scan") {
            const lines: string[] = [];
            try {
              if (getCtxModuleScan) lines.push(...getCtxModuleScan());
            } catch {}
            if (!lines.length) lines.push("Scan returned no results");
            return { content: lines.join("\n") };
          }
          if (action === "keys") {
            const lines: string[] = ["**openLazy keys seen**", ""];
            try { if (getSeenLazyKeys) lines.push(...getSeenLazyKeys()); } catch {}
            return { content: lines.join("\n") };
          }
          if (action === "reset") {
            try { if (resetTrackedCtx) resetTrackedCtx(); } catch {}
            return { content: "Tracked context reset" };
          }
          if (action === "roleicon") {
            if (!settings.roleIcons) {
              return { content: "Role icons are disabled in the Same More Boats plugin settings." };
            }
            if (!guildId) {
              return { content: "Run `/smb roleicon` inside a server. Role icons need boost level 2." };
            }
            const roleId = role ? String(role) : null;
            if (!roleId) {
              try { pickRoleForIcon(guildId); } catch (e) { log("roleicon pick FAIL", e); }
              return { content: "Opened the role picker — tap a role to choose its icon." };
            }
            if (icon) {
              try {
                const res = await setRoleIcon(guildId, roleId, String(icon));
                return res.ok
                  ? { content: `Role icon set on <@&${roleId}>.` }
                  : { content: `Failed (HTTP ${res.status || "?"}${res.reason ? " · " + res.reason : ""}).` };
              } catch (e) { log("roleicon set FAIL", e); }
              return { content: "Failed to set the role icon." };
            }
            try { openRoleIconEditor(guildId, roleId); } catch (e) { log("roleicon open FAIL", e); }
            return { content: `Opened the role icon editor for <@&${roleId}>.` };
          }
          if (action === "shape") {
            const lines: string[] = ["**Native menu row shape**", ""];
            try { if (getItemShape) lines.push(...getItemShape()); } catch {}
            return { content: lines.join("\n") };
          }
          const lines = [
            "**Same More Boats**",
            "",
            "Commands:",
            "`/smb connect <ws://...>` \u2014 Connect React DevTools",
            "`/smb url <ws://...>` \u2014 Save DevTools URL",
            "`/smb status` \u2014 Show diagnostics",
            "`/smb scan` \u2014 Scan context-menu modules",
            "`/smb reset` \u2014 Reset tracked message context",
            "`/smb shape` \u2014 Dump last native menu row prop shape",
            "`/smb keys` \u2014 List ActionSheet openLazy keys seen",
            "`/smb roleicon [role] [icon]` \u2014 Set a role icon (boost lvl 2+)",
            "",
            "Status: " + (settings.devtoolsUrl ? "URL = " + settings.devtoolsUrl : "No DevTools URL set"),
          ];
          return { content: lines.join("\n") };
        } catch (e: any) {
          return { content: "SMB error: " + String(e?.message ?? e) };
        }
      },
    } as any);
    log("slash command /smb registered");
  } catch (e) {
    log("registerCommand fail", e);
  }
  return () => {
    if (unregCmd) { try { unregCmd(); } catch {} unregCmd = null; }
  };
}
