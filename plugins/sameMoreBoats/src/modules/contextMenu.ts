// Context menu row injection is handled in actionSheet.ts (patching
// ActionSheet.openLazy). This module is a thin no-op kept so the feature
// toggle in settings has something to point at while remaining cheap: when
// enabled it does nothing at runtime beyond confirming the toggle is on.

import { log } from "./utils";

export function expandContextMenu(): () => void {
  log("contextMenu toggle: enabled (row injection lives in actionSheet.ts)");
  return () => {};
}
