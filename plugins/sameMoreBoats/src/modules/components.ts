import { React, ReactNative } from "@vendetta/metro/common";
import { find, findByName, findByNameAll, findByProps, findByDisplayName, findByDisplayNameAll, findByStoreName } from "@vendetta/metro";
import { before, after, instead } from "@vendetta/patcher";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

type Unpatch = () => void;

const { View, Text, TouchableOpacity, Platform } = ReactNative as any;

const roleCache = new Map<string, Map<string, any>>();
function refreshRoles(guildId: string, roles: any[]) {
  if (!guildId || !Array.isArray(roles)) return;
  let map = roleCache.get(guildId);
  if (!map) { map = new Map(); roleCache.set(guildId, map); }
  for (const r of roles) if (r?.id) map.set(r.id, r);
}
function findRole(guildId: string, roleId: string) {
  return roleCache.get(guildId)?.get(roleId) ?? null;
}

export function refreshRoleCache(guildId: string, roles: any[]) {
  refreshRoles(guildId, roles);
}

function BotTagPill({ text, color }: { text: string; color?: string }) {
  return React.createElement(
    View,
    {
      style: {
        backgroundColor: color || "#5865F2",
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 1,
        marginLeft: 4,
        alignSelf: "center",
      },
    },
    React.createElement(
      Text,
      { style: { color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "uppercase" } },
      text,
    ),
  );
}

function computeTagsFor(author: any, member: any, guildId?: string): { text: string; color?: string }[] {
  const tags: { text: string; color?: string }[] = [];
  try {
    if (author?.bot) tags.push({ text: "BOT", color: "#5865F2" });
    if (author?.system) tags.push({ text: "SYSTEM", color: "#4E5058" });
    if (member?.roles && guildId) {
      for (const roleId of member.roles) {
        const role = findRole(guildId, roleId);
        if (role?.tags?.bot_id || role?.tags?.integration_id || role?.icon || role?.unicode_emoji) {
          const name = role.unicode_emoji ? `${role.unicode_emoji} ${role.name}` : role.name;
          tags.push({ text: name, color: role.color ? `#${role.color.toString(16).padStart(6, "0")}` : "#4E5058" });
        }
      }
    }
  } catch {}
  return tags;
}

function tagsRow(tags: { text: string; color?: string }[]) {
  return React.createElement(
    View,
    { style: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" } },
    ...tags.map((t, i) => React.createElement(BotTagPill, { key: i, text: t.text, color: t.color })),
  );
}

function safeFind(label: string, fn: () => any): any {
  try {
    const r = fn();
    log("find", label, r ? "OK" : "miss");
    return r;
  } catch (e) {
    log("find", label, "ERR", e);
    return null;
  }
}

// Attempt to find the Nameplate / Username component via many strategies.
function findNameplate(): any[] {
  const results: any[] = [];
  const names = ["Nameplate", "NameplateInner", "Username", "MessageAuthor", "BotTag", "BotTagRegular"];
  for (const n of names) {
    const a = safeFind("name:" + n, () => findByName(n, false));
    if (a) results.push(a);
    const all = safeFind("nameAll:" + n, () => findByNameAll(n, false));
    if (Array.isArray(all)) for (const x of all) if (x && !results.includes(x)) results.push(x);
    const d = safeFind("dn:" + n, () => findByDisplayName(n, false));
    if (d) results.push(d);
    const dall = safeFind("dnAll:" + n, () => findByDisplayNameAll(n, false));
    if (Array.isArray(dall)) for (const x of dall) if (x && !results.includes(x)) results.push(x);
    const p = safeFind("props:" + n, () => {
      const m = findByProps(n);
      return m ? m[n] : null;
    });
    if (p) results.push(p);
  }
  return results;
}

// Inject tags into a rendered element by cloning with extra children.
function injectTagsIntoElement(ret: any, tags: any[]): any {
  if (!tags.length || !ret) return ret;
  try {
    if (!React.isValidElement(ret)) return ret;
    const injected = tagsRow(tags);
    const props: any = { ...(ret.props || {}) };
    const children = props.children;
    if (Array.isArray(children)) {
      props.children = [...children, injected];
    } else if (children === undefined || children === null) {
      props.children = [injected];
    } else {
      props.children = [children, injected];
    }
    return React.cloneElement(ret, props);
  } catch (e) {
    log("injectTags FAIL", e);
    return ret;
  }
}

// Patch a component function: try 'default', 'type', then the fn itself.
function patchComponentRender(comp: any, label: string, handleRet: (args: any[], ret: any) => any): Unpatch | void {
  if (!comp) return;
  const unpatches: Unpatch[] = [];
  const tryPatch = (key: string): boolean => {
    try {
      const target = (comp as any)[key];
      if (typeof target !== "function") return false;
      const un = (after as any)(key, comp, (args: any[], ret: any) => {
        try { return handleRet(args, ret); } catch (e) { log(label, key, "after FAIL", e); return ret; }
      });
      if (typeof un === "function") { unpatches.push(un); log(label, "patched", key); return true; }
    } catch (e) { log(label, key, "patch FAIL", e); }
    return false;
  };
  let ok = tryPatch("default");
  if (!ok) ok = tryPatch("type");
  if (!ok && typeof comp === "function") {
    try {
      const un = (after as any)(comp, (args: any[], ret: any) => {
        try { return handleRet(args, ret); } catch (e) { log(label, "self FAIL", e); return ret; }
      });
      if (typeof un === "function") { unpatches.push(un); log(label, "patched self"); ok = true; }
    } catch (e) { log(label, "self patch FAIL", e); }
  }
  if (!ok) { log(label, "no patchable key found"); return; }
  return () => unpatches.forEach((u) => { try { u(); } catch {} });
}

function patchMessageAuthor(): Unpatch | void {
  const comps = findNameplate();
  if (!comps.length) {
    log("MessageAuthor: no components found at all");
    return;
  }
  log("MessageAuthor: found", comps.length, "candidates");
  const unpatches: Unpatch[] = [];
  for (const comp of comps) {
    const un = patchComponentRender(comp, "msgAuthor", (args, ret) => {
      const props = args?.[0] ?? {};
      const author = props.author ?? props.user ?? props.message?.author;
      const member = props.member ?? props.message?.member;
      const guildId = props.guildId ?? props.message?.guildId ?? props.channel?.guild_id;
      if (!author) return ret;
      const tags = computeTagsFor(author, member, guildId);
      if (!tags.length) return ret;
      return injectTagsIntoElement(ret, tags);
    });
    if (typeof un === "function") unpatches.push(un);
  }
  if (!unpatches.length) { log("MessageAuthor: none patchable"); return; }
  return () => unpatches.forEach((u) => { try { u(); } catch {} });
}

// ---- Context menu patch ----
// Mobile Discord context menus: items are built by a function returning an array
// of {label, action, ...} or React elements. We search broadly.
function patchContextMenuItems(): Unpatch | void {
  const finderKeys = [
    "buildMessageContextMenuItems", "buildContextMenuItems", "menuItems",
    "getMessageContextMenus", "openContextMenu", "buildMenu", "getMenuItems",
    "ContextMenuContainer", "MenuContainer", "ActionSheetPresenter",
    "MessageContextMenu", "ContextMenu",
  ];
  let targetMod: any = null;
  let targetFnName = "";

  for (const key of finderKeys) {
    const m = safeFind("ctx:" + key, () => findByProps(key));
    if (m && typeof m[key] === "function") {
      targetMod = m;
      targetFnName = key;
      break;
    }
  }

  if (!targetMod) {
    try {
      const m = (find as any)((mod: any) => {
        if (!mod || typeof mod !== "object") return false;
        for (const k of Object.keys(mod)) {
          const v = mod[k];
          if (typeof v === "function" && /context.?menu|menuItems|buildMenu|getMenuItems/i.test(k)) return true;
        }
        return false;
      });
      if (m) {
        for (const k of Object.keys(m)) {
          if (typeof m[k] === "function" && /context.?menu|menuItems|buildMenu|getMenuItems/i.test(k)) {
            targetMod = m;
            targetFnName = k;
            break;
          }
        }
      }
    } catch (e) { log("ctx filter find FAIL", e); }
  }

  if (!targetMod || !targetFnName) {
    log("ContextMenu: no builder found anywhere");
    return;
  }

  log("ContextMenu builder found:", targetFnName);

  return (after as any)(targetFnName, targetMod, (args: any[], ret: any) => {
    try {
      if (!Array.isArray(ret)) return ret;
      const ctx = args?.[0] ?? {};
      const target = ctx.message ?? ctx.user ?? ctx.channel;
      const additions: any[] = [];

      if (target?.id) {
        additions.push({
          label: "Copy ID",
          id: "smb-copy-id",
          action: () => {
            try {
              const clip = (ReactNative as any).Clipboard;
              if (clip?.setString) clip.setString(String(target.id));
            } catch {}
            log("Copy ID:", target.id);
          },
        });
      }
      if (ctx.message?.id && ctx.channelId) {
        additions.push({
          label: "Copy Message Link",
          id: "smb-copy-link",
          action: () => {
            try {
              const guild = ctx.guildId ? `${ctx.guildId}/` : "@me/";
              const clip = (ReactNative as any).Clipboard;
              if (clip?.setString) clip.setString(`https://discord.com/channels/${guild}${ctx.channelId}/${ctx.message.id}`);
            } catch {}
          },
        });
      }
      if (ctx.user?.id) {
        additions.push({
          label: "Copy User ID",
          id: "smb-copy-user-id",
          action: () => {
            try {
              const clip = (ReactNative as any).Clipboard;
              if (clip?.setString) clip.setString(String(ctx.user.id));
            } catch {}
          },
        });
      }

      if (additions.length) {
        additions.unshift({ type: "divider", id: "smb-divider" });
        return [...ret, ...additions];
      }
      return ret;
    } catch (e) {
      log("contextMenu render FAIL", e);
      return ret;
    }
  });
}

function diagnostics(): string[] {
  const out: string[] = [];
  const checks: [string, () => any][] = [
    ["MessageAuthor", () => findNameplate().length],
    ["ctxMenu.builder", () => findByProps("buildMessageContextMenuItems")],
    ["ctxMenu.items", () => findByProps("menuItems")],
    ["ctxMenu.open", () => findByProps("openContextMenu")],
    ["ctxMenu.container", () => findByProps("ContextMenuContainer")],
    ["nameplate", () => findByName("Nameplate", false)],
    ["nameplateInner", () => findByName("NameplateInner", false)],
    ["username", () => findByName("Username", false)],
    ["GuildStore", () => findByStoreName("GuildStore")],
    ["GuildMemberStore", () => findByStoreName("GuildMemberStore")],
    ["RoleStore", () => findByStoreName("RoleStore")],
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

export function patchComponents(): Unpatch {
  const un: Unpatch[] = [];
  const safe = (label: string, fn: () => Unpatch | void) => {
    try {
      const r = fn();
      if (typeof r === "function") un.push(r);
    } catch (e) {
      log("patchComponents", label, "FAIL", e);
    }
  };

  safe("messageAuthor", patchMessageAuthor);
  safe("contextMenu", patchContextMenuItems);

  log("component patches:", un.length);
  return () => un.forEach((u) => { try { u(); } catch {} });
}
