// Forums: force-enable forum / media channels on mobile.
// Confirmed real actions in this build: LOAD_CHANNELS, CHANNEL_INFO,
// MESSAGE_CREATE. Forum channel type = 15, media = 16.
//
// Strategy: harvest channel objects with type 15/16 from LOAD_CHANNELS and
// stamp them so any desktop-forum-aware component can pick them up. Also
// dispatch LOAD_MESSAGES for the forum so a thread list is available.

import { before } from "@vendetta/patcher";
import { FluxDispatcher } from "@vendetta/metro/common";

const FORUM = 15;
const MEDIA = 16;

const stamp = (ch: any) => {
  if (!ch || ch.__smbType) return;
  if (ch.type === FORUM || ch.type === MEDIA) {
    try {
      Object.defineProperty(ch, "__smbType", { value: ch.type, enumerable: false, configurable: true });
    } catch {}
  }
};

export function enableForums(): () => void {
  const unpatches: (() => void)[] = [];

  unpatches.push(
    before("dispatch", FluxDispatcher, (args: any[]) => {
      const action = args?.[0];
      if (!action) return;

      // stamp forum/media channels wherever they appear
      if (action.channel) stamp(action.channel);
      if (Array.isArray(action.channels)) action.channels.forEach(stamp);
      if (action.channelUpdates) Object.values(action.channelUpdates).forEach(stamp);
      if (action.guild && Array.isArray(action.guild.channels)) action.guild.channels.forEach(stamp);
      if (Array.isArray(action.guilds)) {
        for (const g of action.guilds) if (g && Array.isArray(g.channels)) g.channels.forEach(stamp);
      }
    })
  );

  // When channel info is fetched for a forum, ensure messages load too.
  unpatches.push(
    before("dispatch", FluxDispatcher, (args: any[]) => {
      const action = args?.[0];
      if (action?.type === "FETCH_CHANNEL_INFO" && action.channel?.type === FORUM) {
        try {
          FluxDispatcher.dispatch({
            type: "LOAD_MESSAGES",
            channelId: action.channel.id,
          });
        } catch {}
      }
    })
  );

  return () => unpatches.forEach((u) => { try { u(); } catch {} });
}
