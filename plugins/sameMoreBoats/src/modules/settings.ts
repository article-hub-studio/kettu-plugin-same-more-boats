import { React, ReactNative } from "@vendetta/metro/common";
import { connectToDebugger } from "@vendetta/debug";
import { config } from "@vendetta/loader";
import { showCustomAlert, showInputAlert, showConfirmationAlert } from "@vendetta/ui/alerts";
import { Forms, General } from "@vendetta/ui/components";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { createMMKVBackend, createStorage, wrapSync } from "@vendetta/storage";
import { registerCommand } from "@vendetta/commands";
import { ApplicationCommandInputType, ApplicationCommandType } from "@vendetta/constants";
import { toast } from "./toast";

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
  forums: true,
  serverSettings: true,
  groupedMembers: true,
  contextMenu: true,
  devTools: false,
  forceDesktopLayout: false,
  recon: true,
  devtoolsUrl: "",
};

export let settings: SMBSettings = { ...DEFAULTS };

let storagePromise: Promise<void> | null = null;

export async function initStorage(): Promise<void> {
  if (storagePromise) return storagePromise;
  storagePromise = (async () => {
    try {
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

const { View, Text, TextInput, ScrollView, TouchableOpacity } = ReactNative as any;
const { FormSection, FormRow, FormSwitch, FormDivider, FormLabel } = Forms as any;

function SettingRow({ label, sublabel, value, onToggle }: any) {
  try {
    if (FormRow && FormSwitch) {
      return React.createElement(FormRow, {
        label,
        subLabel: sublabel,
        trailing: React.createElement(FormSwitch, { value, onValueChange: onToggle }),
      });
    }
  } catch (e) { log("FormRow fail", e); }
  return React.createElement(View, { style: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16 } },
    React.createElement(View, { style: { flex: 1 } },
      React.createElement(Text, { style: { color: "#dcddde", fontSize: 16, fontWeight: "500" } }, label),
      sublabel ? React.createElement(Text, { style: { color: "#9697a0", fontSize: 13, marginTop: 2 } }, sublabel) : null,
    ),
    React.createElement(TouchableOpacity, { onPress: () => onToggle(!value), activeOpacity: 0.7 },
      React.createElement(View, { style: { width: 44, height: 26, borderRadius: 13, backgroundColor: value ? "#5865F2" : "#4f545c", justifyContent: "center", alignItems: value ? "flex-end" : "flex-start", paddingHorizontal: 2 } },
        React.createElement(View, { style: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" } }),
      ),
    ),
  );
}

function SettingsPanel({ close }: any) {
  const [, forceUpdate] = React.useState(0);
  const rerender = () => forceUpdate((n: number) => n + 1);

  const toggle = (key: keyof SMBSettings) => (val: boolean) => {
    settings[key] = val as any;
    try { settings[key] = val as any; } catch {}
    rerender();
    toast(`${key}: ${val ? "ON" : "OFF"}`);
  };

  const editUrl = () => {
    try {
      showInputAlert({
        title: "ReactDevTools URL",
        placeholder: "ws://192.168.x.x:8097",
        initialValue: settings.devtoolsUrl || "",
        confirmText: "Save",
        onConfirm: (input: string) => {
          settings.devtoolsUrl = input;
          rerender();
          toast("DevTools URL saved");
        },
      });
    } catch (e) { log("editUrl fail", e); }
  };

  const connect = () => {
    try {
      const url = settings.devtoolsUrl;
      if (!url) {
        toast("Set a URL first");
        editUrl();
        return;
      }
      connectToDebugger(url);
      toast("Connecting to DevTools…");
    } catch (e) {
      log("connect fail", e);
      toast("Connect failed: " + String(e));
    }
  };

  const showStatus = () => {
    try {
      import("./components").then((m: any) => {
        const lines: string[] = m.getDiagnostics ? m.getDiagnostics() : ["(no diag)"];
        showConfirmationAlert({
          title: "SMB Status",
          content: lines.join("\n"),
          confirmText: "OK",
          isDismissable: true,
          onConfirm: () => {},
        } as any);
      }).catch((e: any) => {
        toast("status err: " + String(e?.message ?? e));
      });
    } catch (e) { log("showStatus fail", e); }
  };

  const useCustomLoadUrl = () => {
    try {
      const cfg = config as any;
      if (cfg && cfg.customLoadUrl) {
        cfg.customLoadUrl.enabled = !cfg.customLoadUrl.enabled;
        if (cfg.customLoadUrl.enabled && settings.devtoolsUrl) {
          cfg.customLoadUrl.url = settings.devtoolsUrl;
        }
        toast("customLoadUrl: " + (cfg.customLoadUrl.enabled ? "ON" : "OFF"));
        rerender();
      }
    } catch (e) { log("customLoadUrl fail", e); }
  };

  const toggleReactDevTools = () => {
    try {
      const cfg = config as any;
      if (cfg) {
        cfg.loadReactDevTools = !cfg.loadReactDevTools;
        toast("ReactDevTools: " + (cfg.loadReactDevTools ? "ON" : "OFF"));
        rerender();
      }
    } catch (e) { log("loadReactDevTools fail", e); }
  };

  const features: [keyof SMBSettings, string, string][] = [
    ["tags", "Tags", "Bot / role tags next to usernames"],
    ["forums", "Forum Channels", "Show forum & media channels"],
    ["serverSettings", "Server Settings", "Full desktop settings sections"],
    ["groupedMembers", "Grouped Members", "Online / offline member groups"],
    ["contextMenu", "Context Menu", "Copy ID, Copy Link, dev items"],
    ["devTools", "DevTools Logger", "Flux action type inspector"],
    ["forceDesktopLayout", "Desktop Layout", "Force desktop CSS layout tweaks"],
    ["recon", "Recon", "Component discovery diagnostic"],
  ];

  return React.createElement(ScrollView, { style: { flex: 1, backgroundColor: "#313338" } },
    React.createElement(View, { style: { padding: 16, paddingBottom: 8 } },
      React.createElement(Text, { style: { color: "#fff", fontSize: 20, fontWeight: "700" } }, "Same More Boats"),
      React.createElement(Text, { style: { color: "#9697a0", fontSize: 13, marginTop: 4 } }, "PC features for Discord mobile"),
    ),
    React.createElement(View, { style: { height: 1, backgroundColor: "#3f4147", marginHorizontal: 16 } }),
    features.map(([key, label, sub]) =>
      React.createElement(View, { key: key },
        React.createElement(SettingRow, { label, sublabel: sub, value: settings[key], onToggle: toggle(key) }),
        React.createElement(View, { style: { height: 1, backgroundColor: "#3f4147", marginHorizontal: 16 } }),
      )
    ),
    React.createElement(View, { style: { padding: 16, paddingTop: 20 } },
      React.createElement(Text, { style: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 8 } }, "ReactDevTools"),
      React.createElement(TouchableOpacity, { onPress: editUrl, style: { backgroundColor: "#2b2d31", borderRadius: 8, padding: 14, marginBottom: 10 } },
        React.createElement(Text, { style: { color: "#9697a0", fontSize: 12 } }, "DevTools URL"),
        React.createElement(Text, { style: { color: settings.devtoolsUrl ? "#dcddde" : "#4f545c", fontSize: 15, marginTop: 4 } }, settings.devtoolsUrl || "Tap to set URL…"),
      ),
      React.createElement(TouchableOpacity, { onPress: connect, style: { backgroundColor: "#5865F2", borderRadius: 8, padding: 14, marginBottom: 10, alignItems: "center" } },
        React.createElement(Text, { style: { color: "#fff", fontSize: 15, fontWeight: "600" } }, "Connect DevTools"),
      ),
      React.createElement(SettingRow, { label: "Load React DevTools", sublabel: "config.loadReactDevTools", value: (config as any)?.loadReactDevTools, onToggle: toggleReactDevTools }),
      React.createElement(SettingRow, { label: "Custom Load URL", sublabel: "config.customLoadUrl", value: (config as any)?.customLoadUrl?.enabled, onToggle: useCustomLoadUrl }),
    ),
    React.createElement(View, { style: { padding: 16 } },
      React.createElement(TouchableOpacity, { onPress: showStatus, style: { backgroundColor: "#2b2d31", borderRadius: 8, padding: 14, marginBottom: 10, alignItems: "center" } },
        React.createElement(Text, { style: { color: "#dcddde", fontSize: 15, fontWeight: "600" } }, "Status / Diagnostics"),
      ),
      React.createElement(TouchableOpacity, { onPress: close, style: { backgroundColor: "#4f545c", borderRadius: 8, padding: 14, alignItems: "center" } },
        React.createElement(Text, { style: { color: "#fff", fontSize: 15, fontWeight: "600" } }, "Close"),
      ),
      React.createElement(View, { style: { height: 30 } }),
    ),
  );
}

export function openSettings(): void {
  try {
    showCustomAlert(SettingsPanel as any, { close: () => {} });
  } catch (e) {
    log("openSettings fail", e);
    try {
      showConfirmationAlert({
        title: "Same More Boats",
        content: "Settings panel failed to open. Use /smb connect <url> to connect DevTools.",
        confirmText: "OK",
        onConfirm: () => {},
      });
    } catch {}
  }
}

let unregCmd: (() => void) | null = null;

export function registerSmbCommand(): () => void {
  if (unregCmd) return unregCmd;
  try {
    unregCmd = registerCommand({
      name: "smb",
      displayName: "smb",
      description: "Same More Boats settings & DevTools",
      displayDescription: "Same More Boats settings & DevTools",
      inputType: ApplicationCommandInputType.BUILT_IN as any,
      type: ApplicationCommandType.CHAT as any,
      applicationId: "-1",
      options: [
        {
          name: "action",
          displayName: "action",
          description: "open / connect / url",
          displayDescription: "open / connect / url",
          type: 3 as any,
          required: false,
        },
        {
          name: "url",
          displayName: "url",
          description: "DevTools WebSocket URL",
          displayDescription: "DevTools WebSocket URL",
          type: 3 as any,
          required: false,
        },
      ],
      execute: (args: any[], _ctx: any) => {
        try {
          const action = args?.find((a) => a.name === "action")?.value;
          const url = args?.find((a) => a.name === "url")?.value;
          if (action === "connect") {
            const u = url || settings.devtoolsUrl;
            if (!u) return { content: "No URL set. Use `/smb url <ws://...>`" };
            settings.devtoolsUrl = u;
            connectToDebugger(u);
            return { content: "Connecting to DevTools at " + u };
          }
          if (action === "url") {
            if (!url) return { content: "Usage: `/smb url ws://192.168.x.x:8097`" };
            settings.devtoolsUrl = url;
            return { content: "DevTools URL saved: " + url };
          }
          openSettings();
          return { content: "Settings opened" };
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
