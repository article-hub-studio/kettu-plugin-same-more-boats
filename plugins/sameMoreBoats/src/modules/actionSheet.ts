// Context-menu patching via ActionSheet.openLazy: intercept message and user
// sheets as they lazily load, then after-patch their default export to inject
// SMB rows into the rendered tree.

import { React } from "@vendetta/metro/common";
import { findByName } from "@vendetta/metro";
import { before, after } from "@vendetta/patcher";
import { log, safeFind } from "./utils";
import { ActionSheetModule, ActionSheetRow, injectRowsInto, noteLazyKey } from "./injectors";

type Unpatch = () => void;

// Keys whose ActionSheet we augment (messages + user/member profiles).
const MESSAGE_KEYS = ["MessageLongPressActionSheet"];
const isUserKey = (key: string) => /UserProfile|UserActionSheet|User/i.test(key);

export function patchContextMenuItems(): Unpatch | void {
  const unpatches: (() => void)[] = [];

  if (!ActionSheetModule || typeof ActionSheetModule.openLazy !== "function") {
    log("ContextMenu: openLazy module not found");
    return;
  }
  if (!ActionSheetRow) {
    log("ContextMenu: ActionSheetRow component not found");
  }

  const un = (before as any)("openLazy", ActionSheetModule, (args: any[]) => {
    try {
      const [component, key, props] = args;
      if (typeof key === "string") noteLazyKey(key);
      if (!component || typeof component.then !== "function") return;

      const isMessage = MESSAGE_KEYS.includes(key) && props?.message;
      const isUser = isUserKey(key);
      if (!isMessage && !isUser) return;

      // Merge props into tracked context so buildMenuAdditions can resolve ids.
      const ctx: any = { ...props };
      if (props?.message) { ctx.message = props.message; ctx.user = props.message.author; }
      if (props?.user) ctx.user = props.user;
      if (props?.userId) ctx.userId = props.userId;
      if (props?.channelId) ctx.channelId = props.channelId;
      if (props?.channel) ctx.channel = props.channel;
      if (props?.guildId) ctx.guildId = props.guildId;

      component.then((instance: any) => {
        try {
          const unpatchInner = (after as any)("default", instance, (_a: any[], res: any) => {
            try {
              React.useEffect(() => () => { try { unpatchInner(); } catch {} }, []);
              injectRowsInto(res, ctx);
            } catch (e) { log("ctx inner after FAIL", e); }
            return res;
          });
        } catch (e) { log("ctx component.then FAIL", e); }
      }).catch(() => {});
    } catch (e) { log("ctx openLazy FAIL", e); }
  });
  if (typeof un === "function") unpatches.push(un);

  // Also note showUserProfileActionSheet availability (some builds bypass the
  // openLazy key match; it internally calls openLazy, which the hook above
  // already covers — this is purely a diagnosability probe).
  try {
    const userSheet = safeFind("showUserProfileActionSheet", () => findByName("showUserProfileActionSheet", false));
    if (typeof userSheet === "function") {
      log("ContextMenu: showUserProfileActionSheet available");
    }
  } catch {}

  if (!unpatches.length) {
    log("ContextMenu: no patching method found");
    return;
  }

  log("ContextMenu: openLazy patch active");
  return () => unpatches.forEach((u) => { try { u(); } catch {} });
}
