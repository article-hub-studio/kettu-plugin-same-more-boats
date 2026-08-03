// Builds the PC-style additions for message/user context menus: copy IDs,
// message link, raw content, avatar URL, account creation date, message JSON.

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

export function buildMenuAdditions(ctx: any): MenuAddition[] {
  const additions: MenuAddition[] = [];
  try {
    // Merge with tracked context if available
    const mergedCtx = { ...getTrackedCtx(), ...ctx };

    // Try every possible path to extract context data
    const message = mergedCtx.message ?? mergedCtx.msg ?? mergedCtx.data?.message ?? mergedCtx;
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
        label: "Copy ID" + (String(id).length > 18 ? " (" + String(id).slice(0, 8) + "..)" : ""),
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
