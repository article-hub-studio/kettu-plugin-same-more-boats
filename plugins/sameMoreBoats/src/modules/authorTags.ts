// Author tags: render BOT / STAFF / role pills next to message authors,
// mirroring what desktop Discord shows. Finds the message-author ("nameplate")
// components and appends pill elements after their render output.

import { React, ReactNative } from "@vendetta/metro/common";
import {
  find,
  findByName,
  findByNameAll,
  findByProps,
  findByDisplayName,
  findByDisplayNameAll,
} from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { log, safeFind } from "./utils";
import { findRole } from "./context";

const { View, Text } = ReactNative as any;

type Unpatch = () => void;

export type Tag = { text: string; color?: string };

function TagPill({ text, color }: Tag) {
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

export function computeTagsFor(author: any, member: any, guildId?: string): Tag[] {
  const tags: Tag[] = [];
  try {
    if (author?.bot) tags.push({ text: "BOT", color: "#5865F2" });
    if (author?.system) tags.push({ text: "SYSTEM", color: "#4E5058" });
    if (author?.flags != null) {
      const flags = author.flags;
      if (flags & (1 << 16)) tags.push({ text: "BOT", color: "#5865F2" });
      if (flags & 1) tags.push({ text: "STAFF", color: "#5865F2" });
      if (flags & (1 << 2)) tags.push({ text: "HYPESQUAD", color: "#f47b67" });
      if (flags & (1 << 3)) tags.push({ text: "BUG HUNTER", color: "#3ba55d" });
      if (flags & (1 << 6)) tags.push({ text: "HYPESQUAD BRILLIANCE", color: "#f47b67" });
      if (flags & (1 << 7)) tags.push({ text: "HYPESQUAD BRAVERY", color: "#9c84ef" });
      if (flags & (1 << 8)) tags.push({ text: "HYPESQUAD BALANCE", color: "#45ddc0" });
      if (flags & (1 << 9)) tags.push({ text: "EARLY", color: "#7289da" });
      if (flags & (1 << 14)) tags.push({ text: "BUG HUNTER GOLD", color: "#faa61a" });
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

function tagsRow(tags: Tag[]) {
  return React.createElement(
    View,
    { style: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" } },
    ...tags.map((t, i) => React.createElement(TagPill, { key: i, text: t.text, color: t.color })),
  );
}

// Best-effort discovery of components involved in message author rendering.
export function findNameplateComponents(): any[] {
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

function injectTagsIntoElement(ret: any, tags: Tag[]): any {
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

// after-patch a component-ish thing across the shapes bundles use:
// module.default, .type, the function itself, .render.
export function patchComponentRender(
  comp: any,
  label: string,
  handleRet: (args: any[], ret: any) => any,
): Unpatch | void {
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

export function patchMessageAuthor(): Unpatch | void {
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
