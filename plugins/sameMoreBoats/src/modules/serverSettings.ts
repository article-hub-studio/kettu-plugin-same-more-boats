// Advanced server settings: mobile builds trim the guild settings sections.
// No GUILD_SETTINGS_OPEN action exists in this build — settings are likely
// pushed via a navigation/route action. We instead watch for any action whose
// name contains "SETTINGS" / "GUILD" and stamp a full desktop section list on
// it when present, so any consumer that reads .sections gets the full set.

import { before } from "@vendetta/patcher";
import { FluxDispatcher } from "@vendetta/metro/common";

const FULL_SECTIONS = [
  { key: "overview", label: "Overview" },
  { key: "roles", label: "Roles" },
  { key: "emoji", label: "Emoji" },
  { key: "stickers", label: "Stickers" },
  { key: "widget", label: "Widget" },
  { key: "automod", label: "AutoMod" },
  { key: "onboarding", label: "Onboarding" },
  { key: "incidents", label: "Incidents" },
  { key: "audit_log", label: "Audit Log" },
  { key: "members", label: "Members" },
  { key: "bans", label: "Bans" },
  { key: "integrations", label: "Integrations" },
  { key: "delete", label: "Delete Server" },
];

export function enableServerSettings(): () => void {
  const unpatches: (() => void)[] = [];

  unpatches.push(
    before("dispatch", FluxDispatcher, (args: any[]) => {
      const action = args?.[0];
      if (!action?.type) return;
      const t: string = action.type;
      // match plausible settings-open actions across builds
      if (/GUILD.*SETTINGS|SETTINGS.*OPEN|GUILD.*CONFIG/i.test(t)) {
        if (!Array.isArray(action.sections) || action.sections.length < FULL_SECTIONS.length) {
          action.sections = FULL_SECTIONS;
        }
      }
    })
  );

  return () => unpatches.forEach((u) => { try { u(); } catch {} });
}
