import {
  find,
  findByDisplayName,
  findByDisplayNameAll,
  findByProps,
  findByName,
  findByNameAll,
  findByStoreName,
} from "@vendetta/metro";
import { log } from "./utils";
import { toast } from "./toast";

function safe<T>(fn: () => T): T | null {
  try { return fn(); } catch { return null; }
}

// Show recon results as a non-blocking Toast (truncated summary) instead of a
// blocking Alert; the full report always goes to the console.
function showModal(title: string, content: string) {
  try {
    const lines = String(content || "").split("\n").filter(Boolean);
    const total = lines.length;
    const summary = lines.slice(0, 4).join("\n") + (total > 4 ? "\n… +" + (total - 4) + " more" : "");
    toast(title + "\n" + summary);
    log("recon full output:\n" + content);
  } catch (e) {
    log("recon showModal FAIL", e);
  }
}

export function runRecon(): void {
  const lines: string[] = [];
  const targets = [
    "RolePill", "ForumPostList", "ForumPostGrid", "ForumPostPressableContainer",
    "ForumPostActionBar", "ProfileBanner", "MemberCount", "ChannelScreen",
    "ChannelBadge", "FastList", "ViewHolderInternal", "TypingIndicatorInner",
    "BotTag", "BotTagRegular", "RoleTag", "AuthorTag",
    "MemberListGroup", "MemberListItem", "MembersList",
    "ContextMenu", "MessageContextMenu",
    "Nameplate", "NameplateInner", "Username", "MessageAuthor",
  ];

  for (const t of targets) {
    const all = safe(() => (findByDisplayNameAll as any)(t));
    lines.push(`dnAll:${t} ${all && all.length ? "OK " + all.length : "miss"}`);
  }

  for (const t of targets) {
    const m = safe(() => (findByProps as any)(t));
    if (m) {
      const exp = m[t];
      const dn = exp?.displayName ?? exp?.name ?? "?";
      lines.push(`props:${t} OK dn=${dn} type=${typeof exp}`);
    } else {
      lines.push(`props:${t} miss`);
    }
  }

  for (const t of targets) {
    const m = safe(() => (findByName as any)(t, false));
    lines.push(`name:${t} ${m ? "OK" : "miss"}`);
  }

  const kw = ["Role", "Tag", "Forum", "Profile", "Member", "Channel", "Bot", "Badge", "Context", "Menu", "Guild", "Setting", "MessageAuthor", "Nameplate"];
  try {
    const matched = (find as any)((m: any) => {
      if (!m || typeof m !== "object") return false;
      const scan = (o: any): boolean => {
        if (!o || typeof o !== "object") return false;
        const dn = o.displayName;
        if (typeof dn === "string") {
          for (const w of kw) if (dn.toLowerCase().includes(w.toLowerCase())) return true;
        }
        return false;
      };
      if (scan(m)) return true;
      for (const p of Object.keys(m)) {
        try { if (scan(m[p])) return true; } catch {}
      }
      return false;
    });
    if (matched) {
      const dns: string[] = [];
      const collect = (o: any) => {
        if (o && typeof o === "object" && typeof o.displayName === "string") dns.push(o.displayName);
      };
      collect(matched);
      for (const p of Object.keys(matched)) { try { collect(matched[p]); } catch {} }
      lines.push(`filter.find matched, displayNames: ${[...new Set(dns)].slice(0, 30).join(", ")}`);
    } else {
      lines.push("filter.find: no match");
    }
  } catch (e: any) {
    lines.push(`filter.find FAIL: ${String(e?.message ?? e).slice(0, 80)}`);
  }

  log("recon v2 done:", lines.length, "lines");
  const body = lines.join("\n");
  showModal("SMB recon", body);
}
