import { React, ReactNative } from "@vendetta/metro/common";
import { createMMKVBackend, createStorage, wrapSync } from "@vendetta/storage";
import { registerCommand } from "@vendetta/commands";
import { ApplicationCommandInputType, ApplicationCommandType } from "@vendetta/constants";
import { connectToDebugger } from "@vendetta/debug";
import { getDiagnostics, getCtxModuleScan, resetTrackedCtx, getTrackedCtx } from "./components";

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
};

export const DEFAULTS: SMBSettings = {
  tags: true,
  forums: false,
  serverSettings: false,
  groupedMembers: false,
  contextMenu: true,
  devTools: false,
  forceDesktopLayout: false,
  recon: false,
  devtoolsUrl: "",
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
          description: "connect / url / status / scan",
          displayDescription: "connect / url / status / scan",
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
      ],
      execute: async (args: any[], _ctx: any) => {
        try {
          const action = args?.find((a) => a.name === "action")?.value;
          const url = args?.find((a) => a.name === "url")?.value;
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
          if (action === "reset") {
            try { if (resetTrackedCtx) resetTrackedCtx(); } catch {}
            return { content: "Tracked context reset" };
          }
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
