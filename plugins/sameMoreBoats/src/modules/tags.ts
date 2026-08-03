// Tags: feed role data into the shared role cache (context.ts) so the
// message-author patch (authorTags.ts) can render bot/role tags next to
// usernames (like desktop). This module just keeps the role cache fed.

import { before } from "@vendetta/patcher";
import { FluxDispatcher } from "@vendetta/metro/common";
import { refreshRoleCache } from "./context";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

function harvestRoles(obj: any, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 6) return;
  if (Array.isArray(obj)) { for (const x of obj) harvestRoles(x, depth + 1); return; }
  if (obj.guildId && Array.isArray(obj.roles)) refreshRoleCache(obj.guildId, obj.roles);
  if (obj.id && Array.isArray(obj.roles)) refreshRoleCache(obj.id, obj.roles);
  if (obj.guild && obj.guild.id && Array.isArray(obj.guild.roles)) refreshRoleCache(obj.guild.id, obj.guild.roles);
  if (Array.isArray(obj.guilds)) for (const g of obj.guilds) if (g?.id && Array.isArray(g.roles)) refreshRoleCache(g.id, g.roles);
  for (const k of Object.keys(obj)) {
    if (k === "roles" || k === "guild" || k === "guilds") continue;
    const v = (obj as any)[k];
    if (v && typeof v === "object") harvestRoles(v, depth + 1);
  }
}

export function enableTags(): () => void {
  const unpatches: (() => void)[] = [];
  unpatches.push(
    before("dispatch", FluxDispatcher, (args: any[]) => {
      try { harvestRoles(args?.[0]); } catch {}
    })
  );
  log("tags: role-cache feeder active");
  return () => unpatches.forEach((u) => { try { u(); } catch {} });
}
