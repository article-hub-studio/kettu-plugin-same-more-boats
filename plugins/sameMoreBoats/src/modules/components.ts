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

// ----- Message context tracker -----
// Captures the most recent message/channel/user from Flux dispatches
// so buildContextMenuAdditions can use them even when the menu context lacks this data
let trackedCtx: any = {};

export function resetTrackedCtx() {
  trackedCtx = {};
  log("tracked context reset");
}

export function getTrackedCtx(): any {
  return { ...trackedCtx };
}

export function updateTrackedCtx(data: any) {
  if (!data) return;
  try {
    if (data.message?.id || data.msg?.id) {
      const msg = data.message ?? data.msg;
      trackedCtx = {
        ...trackedCtx,
        message: msg,
        user: msg.author ?? msg.user ?? trackedCtx.user,
        channel: data.channel ?? trackedCtx.channel,
        channelId: data.channelId ?? data.channel?.id ?? trackedCtx.channelId,
        guildId: data.guildId ?? data.guild?.id ?? trackedCtx.guildId,
      };
    }
    if (data.type === "MESSAGE_CREATE" && data.message) {
      trackedCtx = {
        ...trackedCtx,
        message: data.message,
        user: data.message.author ?? trackedCtx.user,
        channelId: data.message.channel_id ?? trackedCtx.channelId,
        guildId: data.guildId ?? trackedCtx.guildId,
      };
    }
    if ((data.type === "LOAD_MESSAGES_SUCCESS" || data.type === "LOAD_MESSAGES_AROUND_SUCCESS") && data.messages?.length) {
      const last = data.messages[data.messages.length - 1];
      if (last) {
        trackedCtx = {
          ...trackedCtx,
          message: last,
          user: last.author ?? trackedCtx.user,
          channelId: last.channel_id ?? trackedCtx.channelId,
          guildId: data.guildId ?? trackedCtx.guildId,
        };
      }
    }
  } catch (e) { log("trackCtx FAIL", e); }
}

// Set up Flux watcher to track message context
try {
  if (FluxDispatcher && typeof FluxDispatcher.dispatch === "function") {
    (before as any)("dispatch", FluxDispatcher, (args: any[]) => {
      try { updateTrackedCtx(args[0]); } catch {}
    });
  }
} catch (e) { log("trackCtx setup FAIL", e); }

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
    // Merge with tracked context if available
    const mergedCtx = { ...trackedCtx, ...ctx };
    
    // Try every possible path to extract context data
    const message = mergedCtx.message ?? mergedCtx.msg ?? (mergedCtx as any).data?.message ?? mergedCtx;
    const user = mergedCtx.user ?? mergedCtx.author ?? mergedCtx.creator ?? message?.author ?? message?.user ?? mergedCtx;
    const channel = mergedCtx.channel ?? mergedCtx.chan ?? message?.channel ?? mergedCtx;

    // Extract IDs from anywhere in the context
    const id = mergedCtx.id ?? message?.id ?? user?.id ?? channel?.id ?? mergedCtx.guildId ?? mergedCtx.channelId ?? mergedCtx.messageId ?? mergedCtx.userId;
    const messageId = message?.id ?? mergedCtx.messageId ?? mergedCtx.id;
    const userId = user?.id ?? mergedCtx.userId ?? mergedCtx.authorId;
    const channelId = channel?.id ?? mergedCtx.channelId ?? mergedCtx.channel_id;
    const guildId = mergedCtx.guildId ?? mergedCtx.guild_id ?? mergedCtx.guild;

    // Always try to add "Copy ID" if we found ANY id
    if (id) {
      additions.push({
        label: "Copy ID" + (id.length > 18 ? " (" + id.slice(0, 8) + "..)" : ""),
        id: "smb-copy-id",
        action: () => { if (copyText(String(id))) toast("Copied ID"); },
      });
    }

    // Copy Message Link
    if (messageId && channelId) {
      additions.push({
        label: "Copy Message Link",
        id: "smb-copy-link",
        action: () => {
          const g = guildId ? `${guildId}/` : "@me/";
          if (copyText(`https://discord.com/channels/${g}${channelId}/${messageId}`))
            toast("Message link copied");
        },
      });
    }

    // Copy Raw Message
    if (message?.content) {
      additions.push({
        label: "Copy Raw Message",
        id: "smb-copy-raw",
        action: () => { if (copyText(message.content)) toast("Raw message copied"); },
      });
    }

    // Copy User ID + Username
    if (userId) {
      additions.push({
        label: "Copy User ID",
        id: "smb-copy-user-id",
        action: () => { if (copyText(String(userId))) toast("User ID copied"); },
      });
      if (user?.username) {
        additions.push({
          label: "Copy Username",
          id: "smb-copy-username",
          action: () => {
            const uname = user.username + (user.discriminator && user.discriminator !== "0" ? "#" + user.discriminator : "");
            if (copyText(uname)) toast("Username copied");
          },
        });
      }
    }

    // Copy Channel ID
    if (channelId && !messageId) {
      additions.push({
        label: "Copy Channel ID",
        id: "smb-copy-channel-id",
        action: () => { if (copyText(String(channelId))) toast("Channel ID copied"); },
      });
    }

    // Copy Guild ID
    if (guildId) {
      additions.push({
        label: "Copy Guild ID",
        id: "smb-copy-guild-id",
        action: () => { if (copyText(String(guildId))) toast("Guild ID copied"); },
      });
    }
  } catch (e) {
    log("buildAdditions FAIL", e);
  }
  
  // Always add at least one fallback item so the user can see SMB is active
  if (!additions.length) {
    additions.push({
      label: "Same More Boats ✓",
      id: "smb-header",
      action: () => { toast("Same More Boats active"); },
    });
  }
  
  return additions;
}


function hasDupeItem(items: any[], addition: any): boolean {
  if (!addition?.id) return false;
  return items.some((i: any) => i?.id === addition.id);
}

function hasDupeLabel(items: any[], label: string): boolean {
  return items.some((i: any) => typeof i === "string" && i === label);
}

function ctxDebugDump(ctx: any, label: string) {
  try {
    const dump: any = {};
    if (ctx) {
      for (const k of Object.keys(ctx)) {
        try {
          const v = ctx[k];
          if (typeof v === "string") dump[k] = v;
          else if (typeof v === "number") dump[k] = v;
          else if (typeof v === "boolean") dump[k] = v;
          else if (Array.isArray(v)) dump[k] = `Array(${v.length})`;
          else if (v === null) dump[k] = null;
          else if (typeof v === "function") dump[k] = "fn";
          else dump[k] = typeof v;
        } catch {}
      }
    }
    log("ctxDump", label, JSON.stringify(dump).slice(0, 500));
    // Also dump items arrays
    for (const key of ["items", "menuItems", "rows", "options", "actions", "children", "sections"]) {
      if (Array.isArray(ctx?.[key]) && ctx[key].length > 0) {
        const sample = ctx[key].slice(0, 3).map((x: any) => {
          if (typeof x === "string") return x;
          if (typeof x === "object" && x) return JSON.stringify(x).slice(0, 120);
          return typeof x;
        });
        log("ctxDump items in", key, ":", JSON.stringify(sample));
      }
    }
  } catch (e) { log("ctxDebugDump FAIL", e); }
}

// Try to inject additions into an items array. Handles both object items and string items.
function tryInject(items: any[], ctx: any): boolean {
  if (!Array.isArray(items) || !items.length) return false;
  try {
    const additions = buildContextMenuAdditions(ctx);
    if (!additions.length) return false;

    // Check if items are strings (ActionSheet style) or objects
    const isStringItems = typeof items[0] === "string";
    
    if (isStringItems) {
      // ActionSheet style - items are strings like ["Cancel", "Option 1"]
      // We need to add our items as strings too
      let changed = false;
      for (const add of additions) {
        const label = add.label;
        if (!label || hasDupeLabel(items, label)) continue;
        // Insert before the last item (usually Cancel)
        if (items.length > 0) {
          items.splice(items.length - 1, 0, label);
        } else {
          items.push(label);
        }
        changed = true;
      }
      return changed;
    }

    // Check if existing items are React elements (rendered directly as children)
    const hasReactElements = items.some((i: any) => React.isValidElement(i));
    
    if (hasReactElements) {
      // Items are React elements - create proper elements for our additions
      // Use a View as a separator instead of an object with type key
      items.push(
        React.createElement(View, {
          key: "smb-separator",
          style: { height: 1, backgroundColor: "#3f4147", marginVertical: 4 }
        })
      );
      for (const add of additions) {
        items.push(
          React.createElement(TouchableOpacity, {
            key: add.id,
            onPress: () => add.action(),
            style: { paddingHorizontal: 16, paddingVertical: 12 }
          },
            React.createElement(Text, {
              style: { color: "#dcddde", fontSize: 14 }
            }, add.label)
          )
        );
      }
      return true;
    }

    // Plain object items (processed by a builder before rendering - no React crash)
    if (additions.some((a: any) => hasDupeItem(items, a))) return false;
    items.push(...additions);
    return true;
  } catch (e) { log("tryInject FAIL", e); return false; }
}

function patchContextMenuItems(): Unpatch | void {
  const unpatches: (() => void)[] = [];

  // --- Strategy 1: ContextMenuContainer component render ---  
  const ctxContainerMod = safeFind("ContextMenuContainer", () => findByProps("ContextMenuContainer"));
  if (ctxContainerMod?.ContextMenuContainer) {
    log("ContextMenu: ContextMenuContainer");
    const un = patchComponentRender(ctxContainerMod.ContextMenuContainer, "ctxContainer", (_args: any[], ret: any) => {
      try {
        const props = _args?.[0] ?? {};
        // Items might be in props directly or in the data prop
        for (const key of ["items", "menuItems", "children", "data"]) {
          if (Array.isArray(props[key])) {
            tryInject(props[key], props); break;
          }
        }
      } catch {}
      return ret;
    });
    if (typeof un === "function") unpatches.push(un);
  }

  // --- Strategy 2: Patch showContextMenu ---
  const showCtxMod = safeFind("showContextMenu", () => findByProps("showContextMenu"));
  if (showCtxMod && typeof showCtxMod.showContextMenu === "function") {
    log("ContextMenu: showContextMenu (after)");
    unpatches.push(
      (after as any)("showContextMenu", showCtxMod, (args: any[], ret: any) => {
        try {
          // Try all args that look like config
          for (const arg of args) {
            if (arg && typeof arg === "object") {
              ctxDebugDump(arg, "showContextMenu");
              // Deep scan for items arrays
              const scan = (obj: any, depth = 0): boolean => {
                if (!obj || depth > 3) return false;
                for (const key of ["items", "menuItems", "rows", "options", "actions", "children", "sections"]) {
                  if (Array.isArray(obj[key])) {
                    if (tryInject(obj[key], obj)) return true;
                  }
                }
                if (obj.data) {
                  for (const key of ["items", "menuItems", "children"]) {
                    if (Array.isArray(obj.data[key])) {
                      if (tryInject(obj.data[key], obj.data)) return true;
                    }
                  }
                }
                for (const k of Object.keys(obj)) {
                  if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
                    if (scan(obj[k], depth + 1)) return true;
                  }
                }
                return false;
              };
              scan(arg);
            }
          }
        } catch (e) { log("ctx showContextMenu FAIL", e); }
        return ret;
      })
    );
  }

  // --- Strategy 3: Patch updateContextMenuState (context/reducer pattern) ---
  const updMod = showCtxMod || safeFind("updateContextMenuState", () => findByProps("updateContextMenuState"));
  if (updMod && typeof updMod.updateContextMenuState === "function") {
    log("ContextMenu: updateContextMenuState");
    unpatches.push(
      (before as any)("updateContextMenuState", updMod, (args: any[]) => {
        try {
          const stateUpdate = args[0] ?? {};
          ctxDebugDump(stateUpdate, "updateContextMenuState");
          const searchAndInject = (obj: any, depth = 0): boolean => {
            if (!obj || depth > 3) return false;
            for (const key of ["items", "menuItems", "rows"]) {
              if (Array.isArray(obj[key])) {
                if (tryInject(obj[key], obj)) return true;
              }
            }
            for (const k of Object.keys(obj)) {
              if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
                if (searchAndInject(obj[k], depth + 1)) return true;
              }
            }
            return false;
          };
          searchAndInject(stateUpdate);
        } catch (e) { log("ctx updateContextMenuState FAIL", e); }
      })
    );
  }

  // --- Strategy 4: Patch openContextMenu ---
  const openCtx = safeFind("openContextMenu", () => findByProps("openContextMenu"));
  if (openCtx && typeof openCtx.openContextMenu === "function") {
    log("ContextMenu: openContextMenu");
    unpatches.push(
      (instead as any)("openContextMenu", openCtx, (args: any[], orig: Function) => {
        try {
          for (const arg of args) {
            if (arg && typeof arg === "object") {
              ctxDebugDump(arg, "openContextMenu");
              for (const key of ["items", "menuItems", "rows", "options", "actions"]) {
                if (Array.isArray(arg[key])) {
                  tryInject(arg[key], arg);
                }
              }
              if (arg.data) {
                for (const key of ["items", "menuItems"]) {
                  if (Array.isArray(arg.data[key])) {
                    tryInject(arg.data[key], arg.data);
                  }
                }
              }
            }
          }
        } catch (e) { log("ctx openContextMenu FAIL", e); }
        return orig(...args);
      })
    );
  }

  // --- Strategy 5: BottomSheet component ---
  const bsMod = safeFind("BottomSheet", () => findByProps("BottomSheet"));
  if (bsMod?.BottomSheet) {
    log("ContextMenu: BottomSheet");
    const un = patchComponentRender(bsMod.BottomSheet, "bottomSheet", (a: any[], r: any) => {
      try {
        const p = a?.[0] ?? {};
        for (const k of ["items", "children", "rows"]) {
          if (Array.isArray(p[k])) { tryInject(p[k], p); break; }
        }
      } catch {}
      return r;
    });
    if (typeof un === "function") unpatches.push(un);
  }

  // --- Strategy 6: showActionSheet ---
  const actionMod = safeFind("showActionSheet", () => findByProps("showActionSheet"));
  if (actionMod) {
    if (typeof actionMod.showActionSheet === "function") {
      log("ContextMenu: showActionSheet");
      unpatches.push(
        (before as any)("showActionSheet", actionMod, (args: any[]) => {
          try {
            const config = args[0] ?? {};
            ctxDebugDump(config, "showActionSheet");
            for (const key of ["items", "options", "menuItems"]) {
              if (Array.isArray(config[key])) {
                tryInject(config[key], config); break;
              }
            }
          } catch (e) { log("ctx showActionSheet FAIL", e); }
        })
      );
    }
    // Also try patching the default export
    if (typeof actionMod.default === "function") {
      log("ContextMenu: ActionSheet(default)");
      const orig = actionMod.default;
      actionMod.default = function (...a: any[]) {
        try {
          const config = a[0] ?? {};
          for (const key of ["items", "options", "menuItems"]) {
            if (Array.isArray(config[key])) {
              tryInject(config[key], config); break;
            }
          }
        } catch {}
        return orig.apply(this, a);
      };
      unpatches.push(() => { actionMod.default = orig; });
    }
  }

  // --- Strategy 7: Flux dispatch intercept ---
  try {
    if (FluxDispatcher && typeof FluxDispatcher.dispatch === "function") {
      unpatches.push(
        (before as any)("dispatch", FluxDispatcher, (args: any[]) => {
          try {
            const action = args?.[0];
            if (!action?.type) return;
            if (/CONTEXT_MENU|LONG_PRESS/i.test(action.type)) {
              for (const key of ["items", "menuItems", "options"]) {
                if (Array.isArray(action[key])) {
                  tryInject(action[key], action); break;
                }
              }
            }
          } catch {}
        })
      );
    }
  } catch {}

  // --- Strategy 8: Direct ContextMenuStore patch ---
  try {
    // The module with showContextMenu also has ContextMenuStore
    if (showCtxMod && showCtxMod.ContextMenuStore) {
      log("ContextMenu: ContextMenuStore");
      // Try to find a method that stores items
      const store = showCtxMod.ContextMenuStore;
      if (typeof store.getState === "function") {
        const un = (before as any)("getState", store, () => {
          try {
            const state = store.getState();
            if (state) {
              for (const key of ["items", "menuItems", "rows"]) {
                if (Array.isArray(state[key])) {
                  tryInject(state[key], state);
                }
              }
            }
          } catch {}
        });
        if (typeof un === "function") unpatches.push(un);
      }
    }
  } catch {}

  // --- Summary ---
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
    ["ctxMenu.showCtxMenu", () => findByProps("showContextMenu")],
    ["ctxMenu.showActionSheet", () => findByProps("showActionSheet")],
    ["ctxMenu.updCtxState", () => findByProps("updateContextMenuState")],
    ["ctxMenu.bottomSheet", () => findByProps("BottomSheet")],
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

// Deep scan: find ALL modules with context-menu related properties
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
