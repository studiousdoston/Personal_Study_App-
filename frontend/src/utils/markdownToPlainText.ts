import type { Nodes } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";

const parser = unified().use(remarkParse);

const BLOCK_PARENTS = new Set(["root", "blockquote", "list", "listItem"]);

function toText(node: Nodes): string {
  switch (node.type) {
    case "text":
    case "inlineCode":
    case "code":
      return node.value;
    case "break":
      return " ";
    case "html":
    case "image":
    case "imageReference":
      return "";
  }
  if (!("children" in node)) return "";
  return node.children.map(toText).join(BLOCK_PARENTS.has(node.type) ? " " : "");
}

export function markdownToPlainText(markdown: string): string {
  return toText(parser.parse(markdown)).replace(/\s+/g, " ").trim();
}
