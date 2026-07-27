// Grouped member list: desktop groups members by role (online/offline then by
// top role). Mobile flattens to a simple online list.
// No GUILD_MEMBERS_CHUNK in this build — members arrive via GUILD_MEMBER_ADD
// and presence via PRESENCE_UPDATES / SELF_PRESENCE_STORE_UPDATE. We stamp a
// computed groups array on any action carrying member data so a grouped
// renderer (if present) can read it.

import { before } from "@vendetta/patcher";
import { FluxDispatcher } from "@vendetta/metro/common";

type Group = { id: string; label: string; count: number; collapsed: boolean };

function buildGroups(members: any[]): Group[] {
  const online = members.filter((m) => m?.status !== "offline");
  const offline = members.filter((m) => m?.status === "offline");
  const groups: Group[] = [
    { id: "online", label: "Online", count: online.length, collapsed: false },
  ];
  if (offline.length) groups.push({ id: "offline", label: "Offline", count: offline.length, collapsed: true });
  return groups;
}

export function enableGroupedMemberList(): () => void {
  const unpatches: (() => void)[] = [];

  unpatches.push(
    before("dispatch", FluxDispatcher, (args: any[]) => {
      const action = args?.[0];
      if (!action) return;

      // collect any member array we can find
      let members: any[] | null = null;
      if (Array.isArray(action.members)) members = action.members;
      else if (action.member) members = [action.member];

      if (members && members.length) {
        (action as any).__smbGroups = buildGroups(members);
        (action as any).__smbGrouped = true;
      }
    })
  );

  return () => unpatches.forEach((u) => { try { u(); } catch {} });
}
