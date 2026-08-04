// Role icon editor for mobile.
//
// Discord only exposes role icons (emoji shown inline beside a role name) on
// desktop, and only for servers with boost level 2+. This module re-adds that
// capability on mobile: pick a role (or pass one via `/smb roleicon`), choose an
// emoji, and Same More Boats PATCHes the role through the Discord API.
//
// Built with React.createElement deliberately — the build pipeline doesn't
// configure a JSX transform, and the rest of the plugin avoids JSX too.

import { React, ReactNative } from "@vendetta/metro/common";
import { showConfirmationAlert, showInputAlert } from "@vendetta/ui/alerts";
import { General } from "@vendetta/ui/components";
import { log } from "./utils";
import { toast } from "./toast";
import { getGuildRoles, getPremiumTier, setRoleIcon } from "./discordApi";

const { View, Text } = General;

const BOOST_TIER_NEEDED = 2;

const EMOJIS = [
  "😀", "😎", "🥳", "😍", "🤖", "👾", "😈", "😇",
  "🔥", "✨", "💫", "💖", "💎", "⚡", "🎉", "🎯",
  "🏆", "🚀", "⭐", "🌙", "🌈", "🍕", "🍀", "❤️",
];

function h(type: any, props: any, ...children: any[]) {
  return React.createElement(type, props ?? null, ...children);
}

function applyIcon(guildId: string, roleId: string, icon: string, setStatus: (s: string) => void) {
  setStatus("Applying…");
  (setRoleIcon(guildId, roleId, icon || ""))
    .then((r) => {
      if (r.ok) {
        const msg = icon ? "Role icon set" : "Role icon removed";
        toast(msg);
        setStatus("✓ " + msg);
      } else {
        toast(`Failed (HTTP ${r.status || "?"})`);
        setStatus(`✗ Failed (HTTP ${r.status || "?"})`);
      }
    })
    .catch(() => {
      toast("Failed to set role icon");
      setStatus("✗ Failed");
    });
}

function openCustomEmoji(guildId: string, roleId: string, setStatus: (s: string) => void) {
  try {
    showInputAlert({
      title: "Custom role icon",
      placeholder: "Paste an emoji (e.g. 😀 or :emoji:)",
      confirmText: "Set",
      onConfirm: (input: string) => {
        const value = String(input || "").trim();
        if (!value) { toast("Icon unchanged"); return; }
        applyIcon(guildId, roleId, value, setStatus);
      },
    });
  } catch (e) {
    log("custom emoji alert FAIL", e);
  }
}

// Preset grid + Custom + Remove, rendered inside a confirmation alert so there
// is always a dismissible "Done" button.
function RoleIconPicker(guildId: string, roleId: string, tier: number): any {
  const [status, setStatus] = React.useState("");

  const row = (icon: string) =>
    h(
      ReactNative.Pressable,
      {
        key: icon,
        onPress: () => applyIcon(guildId, roleId, icon, setStatus),
        style: {
          width: 40, height: 40, margin: 4, borderRadius: 8,
          alignItems: "center", justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.04)",
        },
      },
      h(Text, { style: { fontSize: 24 } }, icon)
    );

  const grid = h(
    View,
    { style: { flexDirection: "row", flexWrap: "wrap", marginRight: -4 } },
    EMOJIS.map(row)
  );

  const customBtn = h(
    ReactNative.Pressable,
    { onPress: () => openCustomEmoji(guildId, roleId, setStatus), style: { marginTop: 12 } },
    h(Text, { style: { color: "#00a8fc", fontSize: 15 } }, "Custom emoji…")
  );

  const removeBtn = h(
    ReactNative.Pressable,
    { onPress: () => applyIcon(guildId, roleId, "", setStatus), style: { marginTop: 10 } },
    h(Text, { style: { color: "#f23f43", fontSize: 15 } }, "Remove icon")
  );

  const tierRow = h(
    Text,
    { style: { color: status ? "#949ba4" : "#949ba4", fontSize: 12, marginTop: 12 } },
    status
      ? status
      : (tier >= BOOST_TIER_NEEDED
          ? `Server boost level ${tier} — role icons available.`
          : `Server at boost level ${tier}. Role icons need level ${BOOST_TIER_NEEDED}.`)
  );

  return h(
    View,
    { style: { marginTop: 8 } },
    grid,
    customBtn,
    removeBtn,
    tierRow
  );
}

/** Open the role-icon editor for a specific role. Gates on boost tier. */
export function openRoleIconEditor(guildId: string, roleId: string) {
  try {
    if (!guildId || !roleId) { toast("Missing guild or role"); return; }
    const tier = getPremiumTier(guildId);
    if (tier < BOOST_TIER_NEEDED) {
      toast(`Role icons need boost level ${BOOST_TIER_NEEDED} (this server is ${tier})`);
      return;
    }
    showConfirmationAlert({
      title: "Set Role Icon",
      content: RoleIconPicker(guildId, roleId, tier),
      confirmText: "Done",
      cancelText: "Cancel",
      onConfirm: () => {},
      onCancel: () => {},
      isDismissable: true,
    });
  } catch (e) {
    log("openRoleIconEditor FAIL", e);
  }
}

/** Show a scrollable role list, then open the editor for the tapped role. */
export function pickRoleForIcon(guildId: string) {
  try {
    if (!guildId) { toast("Run `/smb roleicon` inside a server"); return; }
    const tier = getPremiumTier(guildId);
    if (tier < BOOST_TIER_NEEDED) {
      toast(`Role icons need boost level ${BOOST_TIER_NEEDED} (this server is ${tier})`);
      return;
    }
    const roles = getGuildRoles(guildId);
    if (!roles.length) { toast("No roles found"); return; }

    const items = roles.map((r: any) =>
      h(
        ReactNative.Pressable,
        {
          key: r.id,
          onPress: () => openRoleIconEditor(guildId, r.id),
          style: {
            paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.06)", borderRadius: 4,
          },
        },
        h(
          View,
          { style: { flexDirection: "row", alignItems: "center", gap: 8 } },
          h(Text, { style: { width: 26, textAlign: "center" } }, r.icon || (r.color ? "#" : "")),
          h(Text, { style: { color: "#dbdee1", fontSize: 15 } }, r.name)
        )
      )
    );

    showConfirmationAlert({
      title: "Pick a role",
      content: h(View, { style: { flexDirection: "column" } }, ...items),
      confirmText: "Done",
      cancelText: "Cancel",
      onConfirm: () => {},
      onCancel: () => {},
      isDismissable: true,
    });
  } catch (e) {
    log("pickRoleForIcon FAIL", e);
  }
}