import type { Emphasis, Nodes, PhrasingContent, Root } from "mdast";

function isTag(node: Nodes, tag: string): boolean {
  return node.type === "html" && node.value.toLowerCase() === tag;
}

function wrapPairs(children: Nodes[]) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let open = 0; open < children.length; open++) {
      if (!isTag(children[open], "<u>")) continue;
      const next = children.findIndex(
        (node, index) => index > open && (isTag(node, "<u>") || isTag(node, "</u>")),
      );
      if (next === -1 || !isTag(children[next], "</u>")) continue;
      const underline: Emphasis = {
        type: "emphasis",
        children: children.slice(open + 1, next) as PhrasingContent[],
        data: { hName: "u" },
      };
      children.splice(open, next - open + 1, underline);
      changed = true;
    }
  }
}

function visit(node: Nodes) {
  if (!("children" in node)) return;
  node.children.forEach(visit);
  wrapPairs(node.children);
}

export function remarkUnderline() {
  return (tree: Root) => visit(tree);
}
