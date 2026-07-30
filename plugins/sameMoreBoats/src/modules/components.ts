import { React, ReactNative, FluxDispatcher, url } from "@vendetta/metro/common";
import { findInReactTree } from "@vendetta/utils";
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
import { getAssetIDByName } from "@vendetta/ui/assets";
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


// Find the component type from existing React element items
function getItemComponentType(items: any[]): any {
  for (const item of items) {
    if (React.isValidElement(item)) {
      return item.type;
    }
  }
  return null;
}

// Check if any existing items look like separators
function findSeparatorItem(items: any[]): any {
  for (const item of items) {
    if (!React.isValidElement(item)) continue;
    const props = item.props || {};
    // View with very thin height or backgroundColor-only style = separator
    if (props.style?.height === 1 || props.style?.marginVertical === 1 || props.style?.marginVertical === 2) {
      return item;
    }
  }
  return null;
}

// Resolve a native Discord asset ID for a menu row icon by label. Native
// menu rows accept an asset id (number) via iconSource; using Discord's own
// asset names keeps the icon visually identical to built-in rows.
function resolveMenuIconAsset(label: string): number | null {
  try {
    if (!getAssetIDByName) return null;
    const lower = (label || "").toLowerCase();
    let names: string[] = [];
    if (lower.includes("link")) names = ["LinkIcon", "ic_link", "CopyLinkIcon"];
    else if (lower.includes("raw") || lower.includes("message")) names = ["ChatIcon", "ic_message", "MessagesIcon", "TextIcon"];
    else if (lower.includes("user") || lower.includes("username")) names = ["PersonIcon", "ic_members", "FriendsIcon", "ProfileIcon"];
    else if (lower.includes("channel")) names = ["ChannelListIcon", "TextChannelIcon", "ic_channel", "HashtagIcon"];
    else if (lower.includes("guild") || lower.includes("server")) names = ["ServerIcon", "GuildIcon", "ic_server", "ShieldIcon"];
    else names = ["CopyIcon", "ic_copy_id", "ClipboardIcon", "IdIcon"];
    for (const n of names) {
      try {
        const id = getAssetIDByName(n);
        if (typeof id === "number" && id > 0) return id;
      } catch {}
    }
  } catch {}
  return null;
}

// Best-effort Discord asset/icon discovery for context menu items.
// We avoid hardcoding remote URLs; this only inspects bundle-known components.
function resolveMenuIcon(label: string): any {
  try {
    const lower = label.toLowerCase();
    // Common icon asset prefixes used in Discord mobile builds
    const iconNames = [
      "CopyIcon", "LinkIcon", "MessageIcon", "UserIcon", "ChannelIcon", "GuildIcon", "MoreIcon", "MenuIcon", "InfoIcon", "CheckIcon", "TickIcon"
    ];
    for (const name of iconNames) {
      try {
        const comp = findByName(name, false);
        if (typeof comp === "function") return comp;
      } catch {}
    }
    const imgMod = safeFind("menuImage", () => findByProps("Image"));
    if (imgMod?.Image) return imgMod.Image;
  } catch {}
  return null;
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

// Convert a Discord snowflake ID to its creation Date (PC-only info surfaced
// on mobile). Low bits are irrelevant for a millisecond timestamp.
function snowflakeToDate(id: string): Date | null {
  try {
    if (!id || !/^\d+$/.test(id)) return null;
    const ms = Math.floor(Number(id) / 4194304) + 1420070400000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
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

    // --- PC-only features brought to mobile ---

    // Copy Avatar URL (desktop right-click "Copy Image" equivalent)
    if (userId && user?.avatar) {
      additions.push({
        label: "Copy Avatar URL",
        id: "smb-copy-avatar",
        action: () => {
          const ext = String(user.avatar).indexOf("a_") === 0 ? "gif" : "png";
          const url = `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.${ext}?size=1024`;
          if (copyText(url)) toast("Avatar URL copied");
        },
      });
    }

    // Copy Account Creation Date (from user snowflake)
    if (userId) {
      additions.push({
        label: "Copy Account Created Date",
        id: "smb-copy-created",
        action: () => {
          const d = snowflakeToDate(String(userId));
          if (d && copyText(d.toISOString())) toast("Created: " + d.toUTCString());
          else toast("Could not resolve creation date");
        },
      });
    }

    // Copy Message JSON (desktop dev feature)
    if (message?.id) {
      additions.push({
        label: "Copy Message JSON",
        id: "smb-copy-json",
        action: () => {
          try {
            const clean = {
              id: message.id,
              channel_id: message.channel_id ?? channelId,
              author: message.author ? { id: message.author.id, username: message.author.username } : undefined,
              content: message.content,
              timestamp: message.timestamp,
              attachments: message.attachments,
              embeds: message.embeds,
            };
            if (copyText(JSON.stringify(clean, null, 2))) toast("Message JSON copied");
          } catch (e) { toast("Could not serialize message"); }
        },
      });
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

// Stores the prop shape of the last real native menu row we saw, so the user
// can inspect it via `/smb shape` even without DevTools.
let lastItemShape: string[] = [];
export function getItemShape(): string[] {
  return lastItemShape.length ? lastItemShape : ["(no native menu row captured yet — open a message context menu first)"];
}

function describeValue(v: any): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  const t = typeof v;
  if (t === "string") return "string(" + (v.length > 16 ? v.slice(0, 16) + "\u2026" : v) + ")";
  if (t === "number" || t === "boolean") return t + "(" + String(v) + ")";
  if (t === "function") return "fn";
  if (React.isValidElement(v)) return "element";
  if (Array.isArray(v)) return "array(" + v.length + ")";
  return "object";
}

// Record a native menu row's type name + prop keys for later inspection.
function captureItemShape(el: any) {
  try {
    if (!React.isValidElement(el)) return;
    const type: any = el.type;
    const name = type?.displayName || type?.name || (typeof type === "string" ? type : "anon");
    const props = (el as any).props || {};
    const lines: string[] = [];
    lines.push("type=" + name);
    for (const k of Object.keys(props)) {
      lines.push("  " + k + ": " + describeValue(props[k]));
    }
    lastItemShape = lines;
    log("nativeItemShape", name, "keys=", Object.keys(props).join(","));
  } catch (e) { log("captureItemShape FAIL", e); }
}

// Determine whether an element looks like a "group" wrapping several rows
// (e.g. Discord's ActionSheetRowGroup) rather than a single row.
function isRowGroup(el: any): boolean {
  if (!React.isValidElement(el)) return false;
  const type: any = (el as any).type;
  const name = type?.displayName || type?.name || "";
  if (/RowGroup|Group|Section/i.test(name)) return true;
  const kids = (el as any).props?.children;
  return Array.isArray(kids) && kids.filter((k: any) => React.isValidElement(k)).length > 1;
}

// Determine whether an element is a thin separator view.
function isSeparator(el: any): boolean {
  if (!React.isValidElement(el)) return false;
  const style: any = (el as any).props?.style;
  return style?.height === 1 || style?.marginVertical === 1 || style?.marginVertical === 2;
}

// Recurse to find a single leaf menu row (has a press handler and/or label,
// but is not itself a group of rows).
function findRowTemplate(items: any[]): any {
  const visit = (nodes: any[], depth: number): any => {
    for (const node of nodes) {
      if (!React.isValidElement(node)) continue;
      if (isSeparator(node)) continue;
      const props: any = (node as any).props || {};
      if (isRowGroup(node) && depth < 4) {
        const kids = Array.isArray(props.children) ? props.children : [props.children];
        const found = visit(kids, depth + 1);
        if (found) return found;
        continue;
      }
      // Leaf row: has a press handler or a text prop.
      if (typeof props.onPress === "function" || typeof props.onSelect === "function"
          || props.label != null || props.title != null) {
        return node;
      }
    }
    return null;
  };
  return visit(items, 0);
}

// Find a group wrapper element we can clone to host our rows.
function findGroupTemplate(items: any[]): any {
  for (const item of items) {
    if (isRowGroup(item)) return item;
  }
  return null;
}

// Clone a native menu row, overriding only its label text, press handler and
// icon so it inherits the exact native Discord styling.
function cloneNativeItem(template: any, add: any): any {
  try {
    if (!React.isValidElement(template)) return null;
    const src: any = (template as any).props || {};
    const next: any = { key: add.id };
    const press = () => { try { add.action(); } catch (e) { log("ctx action FAIL", e); } };

    // Wire the press handler onto whichever prop the native row uses.
    if ("onPress" in src) next.onPress = press;
    else if ("onSelect" in src) next.onSelect = press;
    else if ("onClick" in src) next.onClick = press;
    else next.onPress = press;

    // Override the visible text via whichever text prop exists.
    if ("label" in src) next.label = add.label;
    else if ("title" in src) next.title = add.label;
    else if ("text" in src) next.text = add.label;
    else if ("name" in src) next.name = add.label;

    // Override the icon via whichever icon prop exists, using a native asset id.
    const iconAsset = resolveMenuIconAsset(add.label);
    if (iconAsset != null) {
      if ("iconSource" in src) next.iconSource = iconAsset;
      else if ("icon" in src) next.icon = iconAsset;
      else if ("leftIcon" in src) next.leftIcon = iconAsset;
      else if ("source" in src) next.source = iconAsset;
    }

    // If the row renders text purely via children (no label prop), replace it.
    const hasTextProp = ("label" in src) || ("title" in src) || ("text" in src) || ("name" in src);
    if (!hasTextProp) {
      next.children = renderRowChildren(template, add.label);
    }

    return React.cloneElement(template, next);
  } catch (e) {
    log("cloneNativeItem FAIL", e);
    return null;
  }
}

// Build children matching the template's inner structure: try to reuse the
// template's existing text element and just swap its string content.
function renderRowChildren(template: any, label: string): any {
  try {
    const children = (template as any).props?.children;
    const replaceText = (node: any): any => {
      if (typeof node === "string") return label;
      if (Array.isArray(node)) {
        let replaced = false;
        const out = node.map((n) => {
          if (!replaced && (typeof n === "string" || (React.isValidElement(n) && (n.type === Text || (n as any).type?.displayName === "Text")))) {
            replaced = true;
            if (typeof n === "string") return label;
            return React.cloneElement(n as any, {}, label);
          }
          return n;
        });
        if (replaced) return out;
        return out;
      }
      if (React.isValidElement(node)) {
        return React.cloneElement(node as any, {}, label);
      }
      return label;
    };
    const result = replaceText(children);
    if (result != null) return result;
  } catch (e) { log("renderRowChildren FAIL", e); }
  return React.createElement(Text, { style: { color: "#dbdee1", fontSize: 16 } }, label);
}

// Detect whether our SMB rows are already present in a React-element items
// array (guards against duplicate injection from multiple patch strategies
// and re-renders).
function alreadyInjected(items: any[]): boolean {
  const scan = (nodes: any[], depth: number): boolean => {
    for (const node of nodes) {
      if (!React.isValidElement(node)) continue;
      const key = (node as any).key;
      if (typeof key === "string" && (key.indexOf("smb-") === 0 || key === "smb-group")) return true;
      const kids = (node as any).props?.children;
      if (depth < 4 && kids) {
        const arr = Array.isArray(kids) ? kids : [kids];
        if (scan(arr, depth + 1)) return true;
      }
    }
    return false;
  };
  return scan(items, 0);
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
      // Skip if our rows are already present (avoids duplicates).
      if (alreadyInjected(items)) return false;

      // Find a genuine leaf menu row to clone (inherits exact native styling)
      // and the group wrapper it lives in, if any.
      const rowTemplate = findRowTemplate(items);
      const groupTemplate = findGroupTemplate(items);
      if (rowTemplate) captureItemShape(rowTemplate);

      // Build our replacement rows by cloning the native leaf row.
      const builtRows: any[] = [];
      for (const add of additions) {
        if (rowTemplate) {
          const cloned = cloneNativeItem(rowTemplate, add);
          if (cloned) { builtRows.push(cloned); continue; }
        }
        // Last-resort custom row (only when no native template is available).
        const iconComp = resolveMenuIcon(add.label);
        const children = iconComp
          ? [
              React.createElement(iconComp, { key: "icon", size: 18, color: "#dbdee1" }),
              React.createElement(Text, { key: "label", style: { color: "#dbdee1", fontSize: 16, marginLeft: 12 } }, add.label),
            ]
          : React.createElement(Text, { style: { color: "#dbdee1", fontSize: 16 } }, add.label);
        builtRows.push(
          React.createElement(
            TouchableOpacity,
            {
              key: add.id,
              onPress: () => add.action(),
              style: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
            },
            children,
          ),
        );
      }

      // If the menu groups rows (e.g. ActionSheetRowGroup), wrap ours in a
      // cloned group so they render as a proper native section with divider.
      if (groupTemplate) {
        const groupProps: any = { ...((groupTemplate as any).props || {}) };
        groupProps.key = "smb-group";
        groupProps.children = builtRows;
        items.push(React.cloneElement(groupTemplate, groupProps));
      } else {
        // No group wrapper: add a native-style separator then the rows.
        const existingSep = findSeparatorItem(items);
        if (existingSep) {
          items.push(React.cloneElement(existingSep, { key: "smb-sep" }));
        } else {
          items.push(
            React.createElement(View, {
              key: "smb-sep",
              style: { height: 1, backgroundColor: "#3f4147", marginVertical: 4 },
            }),
          );
        }
        for (const row of builtRows) items.push(row);
      }
      return true;
    }

    // Plain object items (processed by a builder before rendering - no React crash)
    if (additions.some((a: any) => hasDupeItem(items, a))) return false;
    items.push(...additions);
    return true;
  } catch (e) { log("tryInject FAIL", e); return false; }
}

function iconForLabel(id: string, label: string): number | undefined {
  try {
    const map: Record<string, string[]> = {
      "smb-copy-id": ["ic_copy_id", "CopyIcon", "ic_message_copy"],
      "smb-copy-link": ["ic_copy_message_link", "LinkIcon", "ic_link_24px"],
      "smb-copy-raw": ["ic_message_copy", "ic_chat_bubble_16px", "CopyIcon"],
      "smb-copy-user-id": ["ic_members", "ic_copy_id", "CopyIcon"],
      "smb-copy-username": ["ic_members", "ic_copy_id", "CopyIcon"],
      "smb-copy-avatar": ["ic_link_24px", "LinkIcon", "ic_image"],
      "smb-copy-created": ["ic_chat_bubble_16px", "ic_calendar", "ic_copy_id"],
      "smb-copy-json": ["ic_message_copy", "ic_copy_id", "CopyIcon"],
      "smb-copy-channel-id": ["ic_members", "ic_copy_id", "CopyIcon"],
      "smb-copy-guild-id": ["ic_members", "ic_copy_id", "CopyIcon"],
      "smb-jump": ["ic_link_24px", "ic_copy_message_link", "LinkIcon"],
      "smb-header": ["ic_copy_id", "CopyIcon"],
    };
    const names = map[id] || ["ic_copy_id", "CopyIcon"];
    for (const n of names) {
      try {
        const asset = getAssetIDByName(n);
        if (typeof asset === "number" && asset > 0) return asset;
      } catch {}
    }
  } catch {}
  return undefined;
}

// Resolve the ActionSheet lazy-open module + ActionSheetRow component.
const ActionSheetModule = safeFind("openLazy", () => findByProps("openLazy", "hideActionSheet"));
const ActionSheetRowMod = safeFind("ActionSheetRow", () => findByProps("ActionSheetRow"));
const ActionSheetRow: any = ActionSheetRowMod?.ActionSheetRow;

// Record openLazy keys observed on-device so `/smb keys` can report them.
const seenLazyKeys = new Set<string>();
export function getSeenLazyKeys(): string[] {
  return seenLazyKeys.size ? Array.from(seenLazyKeys) : ["(no ActionSheet opened yet - long-press a message or open a profile)"];
}

// Build our ActionSheetRow elements from the additions list.
function buildSmbRows(additions: any[]): any[] {
  const rows: any[] = [];
  for (const add of additions) {
    if (!add?.label) continue;
    const iconAsset = iconForLabel(add.id, add.label);
    const rowProps: any = {
      key: add.id,
      label: add.label,
      onPress: () => {
        try { add.action(); } catch (e) { log("smb row action FAIL", e); }
        try { ActionSheetModule?.hideActionSheet?.(); } catch {}
      },
    };
    if (iconAsset != null && ActionSheetRow?.Icon) {
      rowProps.icon = React.createElement(ActionSheetRow.Icon, { source: iconAsset });
    }
    rows.push(React.createElement(ActionSheetRow, rowProps));
  }
  return rows;
}

// Inject SMB rows into a rendered ActionSheet's row array (found via findInReactTree).
function injectRowsInto(res: any, ctx: any): boolean {
  if (!ActionSheetRow) { log("ActionSheetRow missing"); return false; }
  const additions = buildContextMenuAdditions(ctx);
  if (!additions.length) return false;

  // Try to locate the array of native rows using both known filters.
  let rows = findInReactTree(res, (r: any) =>
    Array.isArray(r) && r[0]?.type?.name === "ActionSheetRowGroup");
  if (!rows) {
    rows = findInReactTree(res, (r: any) =>
      Array.isArray(r) && r[0]?.type?.name === "ButtonRow");
  }
  if (!rows || !Array.isArray(rows)) { log("ctx rows array not found"); return false; }

  // Guard against duplicate injection on re-renders.
  const already = rows.some((r: any) => {
    const k = r?.key;
    return typeof k === "string" && (k === "smb-group" || k.indexOf("smb-") === 0);
  });
  if (already) return false;

  const smbRows = buildSmbRows(additions);
  if (!smbRows.length) return false;

  // Wrap our rows in an ActionSheetRow.Group so they render as a native section.
  if (ActionSheetRow.Group) {
    rows.unshift(React.createElement(ActionSheetRow.Group, { key: "smb-group" }, ...smbRows));
  } else {
    rows.unshift(...smbRows);
  }
  captureItemShape(rows[0]);
  return true;
}

function patchContextMenuItems(): Unpatch | void {
  const unpatches: (() => void)[] = [];

  if (!ActionSheetModule || typeof ActionSheetModule.openLazy !== "function") {
    log("ContextMenu: openLazy module not found");
    return;
  }
  if (!ActionSheetRow) {
    log("ContextMenu: ActionSheetRow component not found");
  }

  // Keys whose ActionSheet we augment (messages + user/member profiles).
  const MESSAGE_KEYS = ["MessageLongPressActionSheet"];
  const isUserKey = (key: string) => /UserProfile|UserActionSheet|User/i.test(key);

  const un = (before as any)("openLazy", ActionSheetModule, (args: any[]) => {
    try {
      const [component, key, props] = args;
      if (typeof key === "string") seenLazyKeys.add(key);
      if (!component || typeof component.then !== "function") return;

      const isMessage = MESSAGE_KEYS.includes(key) && props?.message;
      const isUser = isUserKey(key);
      if (!isMessage && !isUser) return;

      // Merge props into tracked context so buildContextMenuAdditions can resolve ids.
      const ctx: any = { ...props };
      if (props?.message) { ctx.message = props.message; ctx.user = props.message.author; }
      if (props?.user) ctx.user = props.user;
      if (props?.userId) ctx.userId = props.userId;
      if (props?.channelId) ctx.channelId = props.channelId;
      if (props?.channel) ctx.channel = props.channel;
      if (props?.guildId) ctx.guildId = props.guildId;

      component.then((instance: any) => {
        try {
          const unpatchInner = (after as any)("default", instance, (_a: any[], res: any) => {
            try {
              React.useEffect(() => () => { try { unpatchInner(); } catch {} }, []);
              injectRowsInto(res, ctx);
            } catch (e) { log("ctx inner after FAIL", e); }
            return res;
          });
        } catch (e) { log("ctx component.then FAIL", e); }
      }).catch(() => {});
    } catch (e) { log("ctx openLazy FAIL", e); }
  });
  if (typeof un === "function") unpatches.push(un);

  // Also patch showUserProfileActionSheet directly (some builds bypass openLazy key match).
  try {
    const userSheet = safeFind("showUserProfileActionSheet", () => findByName("showUserProfileActionSheet", false));
    if (typeof userSheet === "function") {
      // showUserProfileActionSheet is a plain fn; it internally calls openLazy,
      // which our before-hook above already covers. We just log availability.
      log("ContextMenu: showUserProfileActionSheet available");
    }
  } catch {}

  if (!unpatches.length) {
    log("ContextMenu: no patching method found");
    return;
  }

  log("ContextMenu: openLazy patch active");
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
