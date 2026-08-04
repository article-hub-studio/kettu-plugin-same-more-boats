// Builds the PC-style additions for message/user context menus: copy IDs,
// message link, raw content, avatar URL, account creation date, message JSON.
//
// Key correctness rule: an entry is only shown when the matching data is
// actually present AND of the expected kind. Previously everything fell back to
// `?? mergedCtx`, so `userId`/`messageId` resolved to whatever id was lying
// around and every row appeared in every menu.

import { log } from "./utils";
import { getTrackedCtx } from "./context";
import { copyText } from "./clipboard";
import { toast } from "./toast";
import type { MenuAddition } from "./types";

export type { MenuAddition };

// Convert a Discord snowflake ID to its creation Date (PC-only info surfaced
// on mobile). Low bits are irrelevant for a millisecond timestamp.
export function snowflakeToDate(id: string): Date | null {
  try {
    if (!id || !/^\d+$/.test(id)) return null;
    const ms = Math.floor(Number(id) / 4194304) + 1420070400000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

// True for plausible Discord snowflakes.
function isSnowflake(v: any): v is string {
  return typeof v === "string" && /^\d{15,25}$/.test(v);
}

// Find the first key holding a snowflake id on the object (exact-name match
// only, so we don't accidentally pick a role id as a message id).
function findIdField(obj: any): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  for (const k of ["id", "messageId", "message_id", "userId", "user_id", "channelId", "channel_id", "guildId", "guild_id"]) {
    if (isSnowflake((obj as any)[k])) return (obj as any)[k];
  }
  return undefined;
}

// Try to recognise a message-shaped object (has an author and either content
// or a channel_id — enough to distinguish from a user/channel payload).
function asMessage(v: any): any | undefined {
  if (!v || typeof v !== "object") return undefined;
  const hasAuthor = v.author && typeof v.author === "object";
  const hasContent = typeof v.content === "string";
  const hasChannel = isSnowflake(v.channel_id) || isSnowflake(v.channelId);
  if (hasAuthor || (hasContent && hasChannel)) return v;
  return undefined;
}

// Try to recognise a user-shaped object (pomelo username, no message fields).
function asUser(v: any): any | undefined {
  if (!v || typeof v !== "object") return undefined;
  if (typeof v.username === "string" && isSnowflake(v.id)) return v;
  return undefined;
}

export function buildMenuAdditions(ctx: any): MenuAddition[] {
  const additions: MenuAddition[] = [];
  try {
    // Merge with tracked context if available. trackedCtx only ever receives
    // validated fields, so it never contributes a spurious fallback object.
    const mergedCtx = { ...getTrackedCtx(), ...(ctx || {}) };

    // Resolve each entity strictly — no self-fallbacks (`?? mergedCtx`).
    const rawMessage = mergedCtx.message ?? mergedCtx.msg ?? mergedCtx.data?.message;
    const message = asMessage(rawMessage);

    const rawUser = mergedCtx.user ?? mergedCtx.author ?? mergedCtx.creator
      ?? (message ? message.author ?? message.user : undefined)
      ?? (mergedCtx.member?.user);
    const user = asUser(rawUser);

    const rawChannel = mergedCtx.channel ?? mergedCtx.chan;
    const channel = rawChannel && typeof rawChannel === "object" ? rawChannel : undefined;

    const messageId = (message && (findIdField(message) ?? (isSnowflake(message.id) ? message.id : undefined)))
      ?? (isSnowflake(mergedCtx.messageId) ? mergedCtx.messageId : undefined)
      ?? (isSnowflake(mergedCtx.message_id) ? mergedCtx.message_id : undefined);
    const userId = user ? user.id : (isSnowflake(mergedCtx.userId) ? mergedCtx.userId : (isSnowflake(mergedCtx.user_id) ? mergedCtx.user_id : undefined));
    const channelId = (channel && isSnowflake(channel.id) ? channel.id : undefined)
      ?? (isSnowflake(mergedCtx.channelId) ? mergedCtx.channelId : undefined)
      ?? (isSnowflake(mergedCtx.channel_id) ? mergedCtx.channel_id : undefined)
      ?? (message && (isSnowflake(message.channel_id) ? message.channel_id : undefined));
    const guildId = (isSnowflake(mergedCtx.guildId) ? mergedCtx.guildId : undefined)
      ?? (isSnowflake(mergedCtx.guild_id) ? mergedCtx.guild_id : undefined)
      ?? (mergedCtx.guild && isSnowflake(mergedCtx.guild.id) ? mergedCtx.guild.id : undefined)
      ?? (channel && isSnowflake(channel.guild_id) ? channel.guild_id : undefined);

    // Guild-shaped object (needed for the server icon URL).
    const guild = mergedCtx.guild && typeof mergedCtx.guild === "object" ? mergedCtx.guild : undefined;

    // ----- Message-scoped actions -----

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

    if (message && typeof message.content === "string" && message.content) {
      additions.push({
        label: "Copy Raw Message",
        id: "smb-copy-raw",
        action: () => { if (copyText(message.content)) toast("Raw message copied"); },
      });
    }

    if (messageId) {
      additions.push({
        label: "Copy Message ID" + (String(messageId).length > 18 ? " (" + String(messageId).slice(0, 8) + "..)" : ""),
        id: "smb-copy-id",
        action: () => { if (copyText(String(messageId))) toast("Message ID copied"); },
      });
    }

    if (message) {
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

    // ----- User-scoped actions -----

    if (userId) {
      additions.push({
        label: "Copy User ID",
        id: "smb-copy-user-id",
        action: () => { if (copyText(String(userId))) toast("User ID copied"); },
      });
    }

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

    // ----- Attachment scoped actions -----

    // Copy attachment URLs (PC shows a copyable "Open original" link; mobile
    // doesn't, so we surface the raw CDN URLs here).
    if (message && Array.isArray(message.attachments) && message.attachments.length) {
      const urls = message.attachments
        .map((a: any) => (a && typeof a.url === "string" && a.url) || (a && typeof a.proxy_url === "string" && a.proxy_url) || "")
        .filter((u: string) => !!u);
      if (urls.length) {
        additions.push({
          label: urls.length === 1 ? "Copy Attachment URL" : `Copy ${urls.length} Attachment URLs`,
          id: "smb-copy-attachment",
          action: () => { if (copyText(urls.join("\n"))) toast(urls.length === 1 ? "Attachment URL copied" : urls.length + " attachment URLs copied"); },
        });
      }
    }

    // ----- Channel / guild scoped actions -----

    if (channelId && !messageId) {
      additions.push({
        label: "Copy Channel Link",
        id: "smb-copy-channel-link",
        action: () => {
          const g = guildId ? `${guildId}/` : "@me/";
          if (copyText(`https://discord.com/channels/${g}${channelId}`))
            toast("Channel link copied");
        },
      });
    }

    // Only show channel ID when this isn't a message menu (avoids redundancy
    // with Copy Message Link / ID which already cover that context).
    if (channelId && !messageId) {
      additions.push({
        label: "Copy Channel ID",
        id: "smb-copy-channel-id",
        action: () => { if (copyText(String(channelId))) toast("Channel ID copied"); },
      });
    }

    // Server icon URL — shown wherever a guild is identifiable, alongside the
    // other guild rows.
    if (guildId && guild?.icon) {
      additions.push({
        label: "Copy Server Icon URL",
        id: "smb-copy-guild-icon",
        action: () => {
          const ext = String(guild.icon).indexOf("a_") === 0 ? "gif" : "png";
          const url = `https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.${ext}?size=1024`;
          if (copyText(url)) toast("Server icon URL copied");
        },
      });
    }

    // Only show these guild rows when there's no more specific entity —
    // otherwise every message menu ends with unexplained guild actions.
    if (guildId && !messageId && !userId) {
      additions.push({
        label: "Copy Guild ID",
        id: "smb-copy-guild-id",
        action: () => { if (copyText(String(guildId))) toast("Guild ID copied"); },
      });
      additions.push({
        label: "Copy Guild Created Date",
        id: "smb-copy-guild-created",
        action: () => {
          const d = snowflakeToDate(String(guildId));
          if (d && copyText(d.toISOString())) toast("Guild created: " + d.toUTCString());
          else toast("Could not resolve creation date");
        },
      });
    }
  } catch (e) {
    log("buildAdditions FAIL", e);
  }

  // Fallback row so the user can see SMB is alive even on empty contexts.
  if (!additions.length) {
    additions.push({
      label: "Same More Boats ✓",
      id: "smb-header",
      action: () => { toast("Same More Boats active"); },
    });
  }

  return additions;
}
