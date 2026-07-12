import { findByName } from "@vendetta/metro";
import { ReactNative as RN } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { findInReactTree } from "@vendetta/utils";

type Unpatch = () => unknown;
type Surface = "composer" | "channel" | "section" | "button";

type ComponentClass = {
  prototype?: {
    render?: (...args: unknown[]) => unknown;
  };
};

const GLASS = {
  composer: {
    backgroundColor: "rgba(30, 32, 40, 0.78)",
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 22,
    borderWidth: 1,
    marginHorizontal: 10,
    marginBottom: 7,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden" as const
  },
  channel: {
    backgroundColor: "rgba(255, 255, 255, 0.055)",
    borderColor: "rgba(255, 255, 255, 0.09)",
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 7,
    marginVertical: 2,
    overflow: "hidden" as const
  },
  section: {
    backgroundColor: "rgba(255, 255, 255, 0.045)",
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 8,
    marginVertical: 5,
    overflow: "hidden" as const
  },
  button: {
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden" as const
  }
};

const COMPONENTS: Record<Surface, string[]> = {
  composer: ["ChatInput", "ChannelTextArea", "ChatInputContainer"],
  channel: ["ChannelRow", "ChannelItem", "ChannelListItem", "ChannelListRow"],
  section: ["FormSection", "FormCard", "GuildChannelSection", "ChannelSection"],
  button: ["IconButton", "PressableButton", "CircleButton"]
};

const unpatches: Unpatch[] = [];
const patched = new Set<object>();

function mergeStyle(current: unknown, glass: object) {
  return [current, glass];
}

function getRoot(tree: any) {
  if (tree?.props?.style !== undefined) return tree;
  return findInReactTree(tree, (node: any) =>
    node?.props?.style !== undefined &&
    (node.props.children !== undefined || node.props.accessibilityRole !== undefined)
  );
}

function decorateTree(tree: any, surface: Surface) {
  const root = getRoot(tree);
  if (!root?.props) return;

  root.props.style = mergeStyle(root.props.style, GLASS[surface]);

  if (surface === "composer") {
    const actionBar = findInReactTree(tree, (node: any) =>
      Array.isArray(node?.props?.actions) || node?.props?.forceAnimateButtons !== undefined
    );
    if (actionBar?.props?.style !== undefined) {
      actionBar.props.style = mergeStyle(actionBar.props.style, { backgroundColor: "transparent" });
    }
  }
}

function patchComponent(name: string, surface: Surface) {
  let component: ComponentClass | undefined;

  try {
    component = findByName(name, false) as ComponentClass | undefined;
  } catch {
    return;
  }

  const target = component?.prototype;
  if (!target?.render || patched.has(target)) return;

  patched.add(target);
  unpatches.push(after("render", target, (_args, tree) => decorateTree(tree, surface)));
}

function patchNativeButtons() {
  const target = RN.TouchableOpacity as unknown as ComponentClass;
  if (!target?.prototype?.render || patched.has(target.prototype)) return;

  patched.add(target.prototype);
  unpatches.push(after("render", target.prototype, (_args, tree: any) => {
    const role = tree?.props?.accessibilityRole;
    const label = String(tree?.props?.accessibilityLabel ?? "").toLowerCase();
    const compact = role === "button" && (
      label.includes("send") ||
      label.includes("attach") ||
      label.includes("emoji") ||
      label.includes("gift") ||
      label.includes("more")
    );

    if (compact && tree?.props) {
      tree.props.style = mergeStyle(tree.props.style, GLASS.button);
    }
  }));
}

function onLoad() {
  for (const surface of Object.keys(COMPONENTS) as Surface[]) {
    for (const name of COMPONENTS[surface]) patchComponent(name, surface);
  }
  patchNativeButtons();
}

function onUnload() {
  for (const unpatch of unpatches.splice(0)) {
    try {
      unpatch();
    } catch {}
  }
  patched.clear();
}

export default { onLoad, onUnload };
