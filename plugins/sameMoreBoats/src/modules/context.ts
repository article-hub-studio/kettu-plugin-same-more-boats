// Cross-module state: the most recent message/channel context (for context
// menu enrichment) and a per-guild role cache (for author tag rendering).
// Both were previously buried inside the components.ts kitchen-sink file.

import { before } from "@vendetta/patcher";
import { FluxDispatcher } from "@vendetta/metro/common";
import { log } from "./utils";

// ----- Tracked message context -----
// Captures the most recent message/channel/user from Flux dispatches so
// buildMenuAdditions can use them even when the menu context lacks this data.
let trackedCtx: any = {};

export function resetTrackedCtx() {
  trackedCtx = {};
  log("tracked context reset");
}

export function getTrackedCtx(): any {
  return { ...trackedCtx };
}

function updateTrackedCtx(data: any) {
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

// Set up Flux watcher to track message context.
try {
  if (FluxDispatcher && typeof FluxDispatcher.dispatch === "function") {
    (before as any)("dispatch", FluxDispatcher, (args: any[]) => {
      try { updateTrackedCtx(args[0]); } catch {}
    });
  }
} catch (e) { log("trackCtx setup FAIL", e); }

// ----- Role cache (guildId -> roleId -> role) -----
const roleCache = new Map<string, Map<string, any>>();

export function refreshRoleCache(guildId: string, roles: any[]) {
  if (!guildId || !Array.isArray(roles)) return;
  let map = roleCache.get(guildId);
  if (!map) { map = new Map(); roleCache.set(guildId, map); }
  for (const r of roles) if (r?.id) map.set(r.id, r);
}

export function findRole(guildId: string, roleId: string): any {
  return roleCache.get(guildId)?.get(roleId) ?? null;
}
