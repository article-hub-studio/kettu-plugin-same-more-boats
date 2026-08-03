// Injection helpers: turn MenuAdditions into whatever item shape the host
// menu expects — plain object items, rendered React rows cloned from native
// templates, or ActionSheetRow elements hung off openLazy sheets.

import { React, ReactNative } from "@vendetta/metro/common";
import { findByName, findByProps } from "@vendetta/metro";
import { findInReactTree } from "@vendetta/utils";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { log, safeFind } from "./utils";
import { buildMenuAdditions } from "./menuItems";
import type { MenuAddition } from "./types";

const { View, Text, TouchableOpacity } = ReactNative as any;

// ---------------------------------------------------------------------------
// Item-shape inspection (used by menus that receive prop-bag objects).

export function hasDupeItem(items: any[], addition: MenuAddition): boolean {
  if (!addition?.id) return false;
  return items.some((i: any) => i?.id === addition.id);
}

export function hasDupeLabel(items: any[], label: string): boolean {
  return items.some((i: any) => typeof i === "string" && i === label);
}

// ---------------------------------------------------------------------------
// Icon resolution.

// Resolve a native Discord asset ID for a menu row icon by label. Native
// menu rows accept an asset id (number) via iconSource; using Discord's own
// asset names keeps the icon visually identical to built-in rows.
export function resolveMenuIconAsset(label: string): number | null {
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

// Best-effort Discord asset/icon discovery for context menu items when we
// can't clone a native row. Avoids hardcoding remote URLs.
export function resolveMenuIcon(_label: string): any {
  try {
    const iconNames = [
      "CopyIcon", "LinkIcon", "MessageIcon", "UserIcon", "ChannelIcon", "GuildIcon", "MoreIcon", "MenuIcon", "InfoIcon", "CheckIcon", "TickIcon",
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

// ActionSheetRow preferred asset per addition id.
function iconForLabel(id: string, _label: string): number | undefined {
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

// ---------------------------------------------------------------------------
// React-element template discovery (clone-the-native-row strategy).

// Check if any existing items look like separators
export function findSeparatorItem(items: any[]): any {
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
export function findRowTemplate(items: any[]): any {
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
export function findGroupTemplate(items: any[]): any {
  for (const item of items) {
    if (isRowGroup(item)) return item;
  }
  return null;
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
export function captureItemShape(el: any) {
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

// ---------------------------------------------------------------------------
// Row construction.

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

// Clone a native menu row, overriding only its label text, press handler and
// icon so it inherits the exact native Discord styling.
export function cloneNativeItem(template: any, add: MenuAddition): any {
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

// Try to inject additions into an items array. Handles string items,
// rendered React elements, and plain object items.
export function tryInject(items: any[], ctx: any): boolean {
  if (!Array.isArray(items) || !items.length) return false;
  try {
    const additions = buildMenuAdditions(ctx);
    if (!additions.length) return false;

    // Check if items are strings (ActionSheet style) or objects
    const isStringItems = typeof items[0] === "string";

    if (isStringItems) {
      // ActionSheet style - items are strings like ["Cancel", "Option 1"].
      // We need to add our items as strings too.
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
    if (additions.some((a: MenuAddition) => hasDupeItem(items, a))) return false;
    items.push(...additions);
    return true;
  } catch (e) { log("tryInject FAIL", e); return false; }
}

// ---------------------------------------------------------------------------
// ActionSheetRow-based injection (openLazy sheets).

// Resolve the ActionSheet lazy-open module + ActionSheetRow component.
export const ActionSheetModule = safeFind("openLazy", () => findByProps("openLazy", "hideActionSheet"));
export const ActionSheetRowMod = safeFind("ActionSheetRow", () => findByProps("ActionSheetRow"));
export const ActionSheetRow: any = ActionSheetRowMod?.ActionSheetRow;

// Record openLazy keys observed on-device so `/smb keys` can report them.
const seenLazyKeys = new Set<string>();
export function getSeenLazyKeys(): string[] {
  return seenLazyKeys.size ? Array.from(seenLazyKeys) : ["(no ActionSheet opened yet - long-press a message or open a profile)"];
}
export function noteLazyKey(key: string) {
  try { seenLazyKeys.add(key); } catch {}
}

// Build our ActionSheetRow elements from the additions list.
function buildSmbRows(additions: MenuAddition[]): any[] {
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
export function injectRowsInto(res: any, ctx: any): boolean {
  if (!ActionSheetRow) { log("ActionSheetRow missing"); return false; }
  const additions = buildMenuAdditions(ctx);
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
