// Discord hides many PC-only features behind feature gates / experiment buckets.
// On mobile these gates return false. No GUILD_FEATURE_FLAGS action exists in
// this build — features arrive embedded in guild payloads (LOAD_CHANNELS /
// CONNECTION_OPEN). We harvest any guild.feature array and add the PC-only set.

import { before } from "@vendetta/patcher";
import { FluxDispatcher } from "@vendetta/metro/common";

const PC_GATES = [
  "guild_tags",
  "role_tags",
  "forum_channels",
  "forum_search",
  "guidelines_screen",
  "member_list_grouping",
  "server_guide",
  "onboarding",
  "community_guild_settings_v2",
  "role_icon_upload",
  "guild_role_subscriptions",
  "auto_mod",
  "guild_incidents",
  "member_verification",
  "developer_mode",
  "dev_tools",
] as const;

function addGates(features: any[] | null | undefined): boolean {
  if (!Array.isArray(features)) return false;
  const set = new Set(features as string[]);
  PC_GATES.forEach((g) => set.add(g));
  const arr = Array.from(set);
  if (arr.length !== features.length) {
    (features as any).splice(0, features.length, ...arr);
    return true;
  }
  return false;
}

function harvest(obj: any, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 6) return;
  if (Array.isArray(obj)) { for (const x of obj) harvest(x, depth + 1); return; }
  if (Array.isArray(obj.features)) addGates(obj.features);
  if (obj.guild && Array.isArray(obj.guild.features)) addGates(obj.guild.features);
  if (Array.isArray(obj.guilds)) {
    for (const g of obj.guilds) if (g && Array.isArray(g.features)) addGates(g.features);
  }
  for (const k of Object.keys(obj)) {
    if (k === "features" || k === "guild" || k === "guilds") continue;
    const v = (obj as any)[k];
    if (v && typeof v === "object") harvest(v, depth + 1);
  }
}

export function patchFeatureGates(_cfg: any): () => void {
  const unpatches: (() => void)[] = [];

  unpatches.push(
    before("dispatch", FluxDispatcher, (args: any[]) => {
      try { harvest(args?.[0]); } catch {}
    })
  );

  return () => unpatches.forEach((u) => { try { u(); } catch {} });
}
