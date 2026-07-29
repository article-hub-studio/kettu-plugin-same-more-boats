import { React, ReactNative, FluxDispatcher } from "@vendetta/metro/common";
import {
  find,
  findByName,
  findByNameAll,
  findByProps,
  findByDisplayName,
  findByDisplayNameAll,
  findByStoreName,
} from "@vendetta/metro";
import { before, after, instead } from "@vendetta/patcher";
import { copyText } from "./clipboard";
import { toast } from "./toast";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

type Unpatch = () => void;

const { View, Text, TouchableOpacity } = ReactNative as any;

const roleCache = new Map<string, Map<string, any>>();
function refreshRoles(guildId: string, roles: any[]) {
  if (!guildId || !Array.isArray(roles)) return;
  let map = roleCache.get(guildId);
  if (!map) { map = new Map(); roleCache.set(guildId, map); }
  for (const r of roles) if (r?.id) map.set(r.id, r);
}
export function refreshRoleCache(guildId: string, roles: any[]) {
  refreshRoles(guildId, roles);
}
function findRole(guildId: string, roleId: string) {
  return roleCache.get(guildId)?.get(roleId) ?? null;
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
    if (author?.flags != null) {
      const flags = author.flags;
      if (flags & 1 << 16) tags.push({ text: "BOT", color: "#5865F2" });
      if (flags & 1) tags.push({ text: "STAFF", color: "#5865F2" });
      if (flags & (1 << 2)) tags.push({ text: "HYPESQUAD", color: "#f47b67" });
      if (flags & (1 << 3)) tags.push({ text: "BUG HUNTER", color: "#3ba55d" });
      if (flags & (1 << 9)) tags.push({ text: "EARLY", color: "#7289da" });
      if (flags & (1 << 14)) tags.push({ text: "BUG HUNTER GOLD", color: "#faa61a" });
      if (flags & (1 << 6)) tags.push({ text: "HYPESQUAD BRILLIANCE", color: "#f47b67" });
      if (flags & (1 << 7)) tags.push({ text: "HYPESQUAD BRAVERY", color: "#9c84ef" });
      if (flags & (1 << 8)) tags.push({ text: "HYPESQUAD BALANCE", color: "#45ddc0" });
    }
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
    return r;
  } catch (e) {
    log("find", label, "ERR", e);
    return null;
  }
}

function findNameplateComponents(): any[] {
  const results: any[] = [];
  const seen = new Set<any>();
  const add = (x: any) => { if (x && !seen.has(x)) { seen.add(x); results.push(x); } };

  const names = ["Nameplate", "NameplateInner", "Username", "MessageAuthor", "BotTag", "BotTagRegular", "AuthorTag", "RoleIcon", "PillWrapper", "ButtonPill"];

  for (const n of names) {
    add(safeFind("name:" + n, () => findByName(n, false)));
    const all = safeFind("nameAll:" + n, () => findByNameAll(n, false));
    if (Array.isArray(all)) for (const x of all) add(x);
    add(safeFind("dn:" + n, () => findByDisplayName(n, false)));
    const dall = safeFind("dnAll:" + n, () => findByDisplayNameAll(n, false));
    if (Array.isArray(dall)) for (const x of dall) add(x);
    const p = safeFind("props:" + n, () => { const m = findByProps(n); return m ? m[n] : null; });
    add(p);

    const filterFound = safeFind("filter:" + n, () => find((m: any) => {
      if (typeof m === "function" && (m.displayName === n || m.name === n)) return true;
      if (m && typeof m === "object") {
        for (const k of Object.keys(m)) {
          try {
            const v = m[k];
            if (typeof v === "function" && (v.displayName === n || v.name === n)) return true;
          } catch {}
        }
      }
      return false;
    }));
    add(filterFound);
  }

  return results;
}

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

function patchComponentRender(comp: any, label: string, handleRet: (args: any[], ret: any) => any): Unpatch | void {
  if (!comp) return;
  const unpatches: Unpatch[] = [];

  const tryPatchKey = (parent: any, key: string): boolean => {
    try {
      const target = parent?.[key];
      if (typeof target !== "function") return false;
      const un = (after as any)(key, parent, (args: any[], ret: any) => {
        try { return handleRet(args, ret); } catch (e) { log(label, key, "after FAIL", e); return ret; }
      });
      if (typeof un === "function") { unpatches.push(un); log(label, "patched", key); return true; }
    } catch (e) { log(label, key, "patch FAIL", e); }
    return false;
  };

  let ok = tryPatchKey(comp, "default");
  if (!ok) ok = tryPatchKey(comp, "type");

  if (!ok && typeof comp === "function") {
    try {
      const un = (after as any)(comp, (args: any[], ret: any) => {
        try { return handleRet(args, ret); } catch (e) { log(label, "self FAIL", e); return ret; }
      });
      if (typeof un === "function") { unpatches.push(un); log(label, "patched self"); ok = true; }
    } catch (e) { log(label, "self patch FAIL", e); }
  }

  if (!ok && comp?.type && typeof comp.type === "function") {
    try {
      const un = (after as any)("type", comp, (args: any[], ret: any) => {
        try { return handleRet(args, ret); } catch (e) { log(label, "type FAIL", e); return ret; }
      });
      if (typeof un === "function") { unpatches.push(un); log(label, "patched .type"); ok = true; }
    } catch (e) { log(label, "type patch FAIL", e); }
  }

  if (!ok && comp?.render && typeof comp.render === "function") {
    try {
      const un = (after as any)("render", comp, (args: any[], ret: any) => {
        try { return handleRet(args, ret); } catch (e) { log(label, "render FAIL", e); return ret; }
      });
      if (typeof un === "function") { unpatches.push(un); log(label, "patched .render"); ok = true; }
    } catch (e) { log(label, "render patch FAIL", e); }
  }

  if (!ok) { log(label, "no patchable key"); return; }
  return () => unpatches.forEach((u) => { try { u(); } catch {} });
}

function patchMessageAuthor(): Unpatch | void {
  const comps = findNameplateComponents();
  if (!comps.length) {
    log("MessageAuthor: no components found");
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

function buildContextMenuAdditions(ctx: any): any[] {
  const additions: any[] = [];
  try {
    const target = ctx.message ?? ctx.user ?? ctx.channel ?? ctx;
    const message = ctx.message ?? ctx;
    const user = ctx.user ?? ctx.author ?? (ctx.message?.author);
    const channel = ctx.channel;

    if (target?.id) {
      additions.push({
        label: "Copy ID",
        id: "smb-copy-id",
        action: () => {
          if (copyText(String(target.id))) toast("Copied ID: " + target.id);
        },
      });
    }
    if (message?.id && (ctx.channelId || channel?.id)) {
      const chId = ctx.channelId || channel?.id || "@me";
      additions.push({
        label: "Copy Message Link",
        id: "smb-copy-link",
        action: () => {
          const guild = ctx.guildId ? `${ctx.guildId}/` : "@me/";
          if (copyText(`https://discord.com/channels/${guild}${chId}/${message.id}`))
            toast("Message link copied");
        },
      });
    }
    if (message?.content) {
      additions.push({
        label: "Copy Raw Message",
        id: "smb-copy-raw",
        action: () => {
          if (copyText(message.content)) toast("Raw message copied");
        },
      });
    }
    if (user?.id) {
      additions.push({
        label: "Copy User ID",
        id: "smb-copy-user-id",
        action: () => {
          if (copyText(String(user.id))) toast("User ID copied");
        },
      });
      additions.push({
        label: "Copy Username",
        id: "smb-copy-username",
        action: () => {
          const uname = user.username + (user.discriminator ? "#" + user.discriminator : "");
          if (copyText(uname)) toast("Username copied");
        },
      });
    }
    if ((channel?.id || ctx.channelId) && !message?.id) {
      const chId = channel?.id || ctx.channelId;
      additions.push({
        label: "Copy Channel ID",
        id: "smb-copy-channel-id",
        action: () => {
          if (copyText(String(chId))) toast("Channel ID copied");
        },
      });
    }
  } catch (e) {
    log("buildAdditions FAIL", e);
  }
  return additions;
}

function hasDupeItem(items: any[], addition: any): boolean {
  if (!addition?.id) return false;
  return items.some((i: any) => i?.id === addition.id);
}

function injectAdditions(items: any[], ctx: any): boolean {
  if (!Array.isArray(items)) return false;
  const additions = buildContextMenuAdditions(ctx);
  if (!additions.length) return false;
  // Check we haven't already added our items
  if (additions.some((a) => hasDupeItem(items, a))) return false;
  additions.unshift({ type: "divider", id: "smb-divider" });
  items.push(...additions);
  return true;
}

function patchContextMenuItems(): Unpatch | void {
  const unpatches: (() => void)[] = [];
  let patched = false;

  // Strategy 1: Try finding a builder function and use after() to add items
  const builderKeys = [
    "buildMessageContextMenuItems", "buildContextMenuItems", "menuItems",
    "getMessageContextMenus", "buildMenu", "getMenuItems",
    "getBuiltMenuItems", "createContextMenu", "buildMessageMenu",
    "getLongPressItems", "getMessageMenuItems", "buildActionSheetItems",
    "getContextMenuItems", "getMenuForMessage", "getActionsForMessage",
  ];

  for (const k of builderKeys) {
    if (patched) break;
    const mod = safeFind("ctx:" + k, () => findByProps(k));
    if (mod && typeof mod[k] === "function") {
      log("ContextMenu: builder via", k);
      unpatches.push(
        (after as any)(k, mod, (args: any[], ret: any) => {
          try {
            if (!Array.isArray(ret)) return ret;
            const ctx = args?.[0] ?? {};
            const additions = buildContextMenuAdditions(ctx);
            if (!additions.length) return ret;
            additions.unshift({ type: "divider", id: "smb-divider" });
            return [...ret, ...additions];
          } catch (e) {
            log("contextMenu builder FAIL", e);
            return ret;
          }
        })
      );
      patched = true;
    }
  }

  // Strategy 2: Intercept openContextMenu (confirmed FOUND) — use after()
  // to modify the items array on the config before the menu renders
  if (!patched) {
    const openCtx = safeFind("openContextMenu", () => findByProps("openContextMenu"));
    if (openCtx && typeof openCtx.openContextMenu === "function") {
      log("ContextMenu: using openContextMenu");
      unpatches.push(
        (before as any)("openContextMenu", openCtx, (args: any[]) => {
          try {
            const config = args[0];
            if (!config) return;
            // Try each possible item container
            const candidates = [
              [config.items, config],
              [config.menuItems, config],
              [config.rows, config],
              [config.options, config],
              [config.actions, config],
              [config.data?.items, config.data ?? config],
              [config.data?.menuItems, config.data ?? config],
            ];
            for (const [items, ctx] of candidates) {
              if (injectAdditions(items, ctx)) break;
            }
          } catch (e) {
            log("ctx openContextMenu FAIL", e);
          }
        })
      );
      // Mark as patched even if before doesn't find items — it's our best shot
      patched = true;
    }
  }

  // Strategy 3: Flux intercept — watch for context-menu-bearing actions
  if (!patched) {
    try {
      if (FluxDispatcher && typeof FluxDispatcher.dispatch === "function") {
        log("ContextMenu: using Flux dispatch intercept");
        unpatches.push(
          (before as any)("dispatch", FluxDispatcher, (args: any[]) => {
            try {
              const action = args?.[0];
              if (!action?.type) return;
              if (!/CONTEXT_MENU|LONG_PRESS/i.test(action.type)) return;
              const candidates = [
                [action.items, action],
                [action.menuItems, action],
                [action.options, action],
              ];
              for (const [items, ctx] of candidates) {
                if (injectAdditions(items, ctx)) break;
              }
            } catch {}
          })
        );
      }
    } catch {}
  }

  // Strategy 4: Patch ContextMenuContainer component (also FOUND)
  if (!patched) {
    const ctxContainerMod = safeFind("ContextMenuContainer", () => findByProps("ContextMenuContainer"));
    const ctxContainer = ctxContainerMod?.ContextMenuContainer;
    if (ctxContainer) {
      log("ContextMenu: using ContextMenuContainer patch");
      const un = patchComponentRender(ctxContainer, "ctxContainer", (_args: any[], ret: any) => {
        try {
          const props = _args?.[0] ?? {};
          for (const key of ["items", "menuItems", "children", "data"]) {
            if (Array.isArray(props[key])) {
              injectAdditions(props[key], props);
              break;
            }
          }
        } catch {}
        return ret;
      });
      if (typeof un === "function") { unpatches.push(un); patched = true; }
    }
  }

  if (!unpatches.length) {
    log("ContextMenu: no patching method found");
    return;
  }

  log("ContextMenu: patched with", unpatches.length, "strategies");
  return () => unpatches.forEach((u) => { try { u(); } catch {} });
}
function patchDeveloperMode(): Unpatch | void {
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

function diagnostics(): string[] {
  const out: string[] = [];
  const checks: [string, () => any][] = [
    ["nameplate.comps", () => findNameplateComponents().length],
    ["ctxMenu.builder", () => findByProps("buildMessageContextMenuItems")],
    ["ctxMenu.items", () => findByProps("menuItems")],
    ["ctxMenu.open", () => findByProps("openContextMenu")],
    ["ctxMenu.container", () => findByProps("ContextMenuContainer")],
    ["nameplate", () => findByName("Nameplate", false)],
    ["nameplateInner", () => findByName("NameplateInner", false)],
    ["username", () => findByName("Username", false)],
    ["botTag", () => findByName("BotTag", false)],
    ["GuildStore", () => findByStoreName("GuildStore")],
    ["GuildMemberStore", () => findByStoreName("GuildMemberStore")],
    ["RoleStore", () => findByStoreName("RoleStore")],
    ["DeveloperModeStore", () => findByStoreName("DeveloperModeStore")],
    ["clipboard", () => findByProps("setString")],
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
  safe("developerMode", patchDeveloperMode);

  log("component patches:", un.length);
  return () => un.forEach((u) => { try { u(); } catch {} });
}
