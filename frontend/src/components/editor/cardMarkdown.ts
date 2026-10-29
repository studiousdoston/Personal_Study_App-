import type { JSONContent } from "@tiptap/react";
import type { Definition, Nodes, Root, RootContent } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { isHttpUrl } from "../../utils/isHttpUrl";
import { isUploadUrl } from "../../utils/isUploadUrl";
import { remarkUnderline } from "../../utils/remarkUnderline";

type Mark = { type: string; attrs?: Record<string, unknown> };
type InlineItem = JSONContent | { image: { src: string; alt: string } };
type Definitions = Map<string, Definition>;

const processor = unified().use(remarkParse).use(remarkUnderline);

const MARK_ORDER = ["link", "bold", "italic", "underline"];

//////////////////////////////////////////////////////////
//                   MARKDOWN -> DOC
//////////////////////////////////////////////////////////

export function markdownToDoc(markdown: string): JSONContent {
  const tree = processor.runSync(processor.parse(markdown)) as Root;
  const definitions: Definitions = new Map();
  collectDefinitions(tree, definitions);
  const content = toBlocks(tree.children, definitions);
  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
}

function collectDefinitions(node: Nodes, definitions: Definitions) {
  if (node.type === "definition" && !definitions.has(node.identifier)) {
    definitions.set(node.identifier, node);
  }
  if ("children" in node) node.children.forEach((child) => collectDefinitions(child, definitions));
}

function toBlocks(nodes: RootContent[], definitions: Definitions): JSONContent[] {
  return nodes.flatMap((node): JSONContent[] => {
    switch (node.type) {
      case "paragraph":
        return splitImages(toInline(node.children, [], definitions), (content) => ({
          type: "paragraph",
          content,
        }));
      case "heading":
        return splitImages(toInline(node.children, [], definitions), (content) => ({
          type: "heading",
          attrs: { level: Math.min(node.depth, 3) },
          content,
        }));
      case "list":
        return [
          {
            type: node.ordered ? "orderedList" : "bulletList",
            ...(node.ordered && { attrs: { start: node.start ?? 1 } }),
            content: node.children.map((item) => {
              const blocks = toBlocks(item.children, definitions);
              if (blocks[0]?.type !== "paragraph") blocks.unshift({ type: "paragraph" });
              return { type: "listItem", content: blocks };
            }),
          },
        ];
      case "code":
        return [
          {
            type: "codeBlock",
            attrs: { language: node.lang ?? null },
            ...(node.value && { content: [{ type: "text", text: node.value }] }),
          },
        ];
      case "blockquote":
        return toBlocks(node.children, definitions);
      case "html":
        return [{ type: "paragraph", content: textWithBreaks(node.value, []) }];
      default:
        return [];
    }
  });
}

function toInline(nodes: Nodes[], marks: Mark[], definitions: Definitions): InlineItem[] {
  return nodes.flatMap((node): InlineItem[] => {
    switch (node.type) {
      case "text":
        return textWithBreaks(node.value, marks);
      case "inlineCode":
        return [{ type: "text", text: node.value, marks: [{ type: "code" }] }];
      case "break":
        return [{ type: "hardBreak" }];
      case "strong":
        return toInline(node.children, [...marks, { type: "bold" }], definitions);
      case "emphasis": {
        const type = node.data?.hName === "u" ? "underline" : "italic";
        return toInline(node.children, [...marks, { type }], definitions);
      }
      case "link":
      case "linkReference": {
        const href = node.type === "link" ? node.url : definitions.get(node.identifier)?.url;
        const linkMarks =
          href && isHttpUrl(href) ? [...marks, { type: "link", attrs: { href } }] : marks;
        return toInline(node.children, linkMarks, definitions);
      }
      case "image":
      case "imageReference": {
        const src = node.type === "image" ? node.url : definitions.get(node.identifier)?.url;
        return src && isUploadUrl(src) ? [{ image: { src, alt: node.alt ?? "" } }] : [];
      }
      case "html":
        return /^<br\s*\/?>$/i.test(node.value)
          ? [{ type: "hardBreak" }]
          : textWithBreaks(node.value, marks);
      default:
        return [];
    }
  });
}

function textWithBreaks(value: string, marks: Mark[]): JSONContent[] {
  return value.split("\n").flatMap((line, index) => {
    const text: JSONContent[] = line ? [{ type: "text", text: line, marks }] : [];
    return index === 0 ? text : [{ type: "hardBreak" }, ...text];
  });
}

function splitImages(
  items: InlineItem[],
  wrap: (content: JSONContent[]) => JSONContent,
): JSONContent[] {
  const blocks: JSONContent[] = [];
  let run: JSONContent[] = [];
  const flush = () => {
    while (run[0]?.type === "hardBreak") run.shift();
    while (run.at(-1)?.type === "hardBreak") run.pop();
    if (run.some((node) => node.type !== "text" || node.text?.trim())) blocks.push(wrap(run));
    run = [];
  };
  for (const item of items) {
    if ("image" in item) {
      flush();
      blocks.push({ type: "image", attrs: item.image });
    } else {
      run.push(item);
    }
  }
  flush();
  return blocks;
}

//////////////////////////////////////////////////////////
//                   DOC -> MARKDOWN
//////////////////////////////////////////////////////////

export function docToMarkdown(doc: JSONContent): string {
  return renderBlocks(doc.content ?? []).trim();
}

function renderBlocks(nodes: JSONContent[], inItem = false): string {
  const parts: string[] = [];
  let previous: string | undefined;
  for (const node of nodes) {
    const text = renderBlock(node, previous === node.type);
    if (!text) continue;
    if (parts.length > 0) parts.push(inItem && node.type?.endsWith("List") ? "\n" : "\n\n");
    parts.push(text);
    previous = node.type;
  }
  return parts.join("");
}

function renderBlock(node: JSONContent, alternate: boolean): string {
  switch (node.type) {
    case "paragraph":
      return renderInline(node.content ?? [], false).trim();
    case "heading": {
      const text = renderInline(node.content ?? [], true).trim();
      return text ? `${"#".repeat(Number(node.attrs?.level ?? 1))} ${text}` : "";
    }
    case "bulletList":
    case "orderedList":
      return renderList(node, alternate);
    case "codeBlock":
      return renderCodeBlock(node);
    case "image": {
      const src = String(node.attrs?.src ?? "");
      const alt = String(node.attrs?.alt ?? "").replace(/[[\]\\\n]/g, "");
      return isUploadUrl(src) ? `![${alt}](${src})` : "";
    }
    default:
      return "";
  }
}

function renderList(node: JSONContent, alternate: boolean): string {
  const ordered = node.type === "orderedList";
  const start = Number(node.attrs?.start ?? 1);
  return (node.content ?? [])
    .map((item, index) => {
      const marker = ordered ? `${start + index}${alternate ? ")" : "."}` : alternate ? "*" : "-";
      const body = renderBlocks(item.content ?? [], true);
      if (!body) return marker;
      const pad = " ".repeat(marker.length + 1);
      const indented = body
        .split("\n")
        .map((line, lineIndex) => (lineIndex === 0 || line === "" ? line : pad + line))
        .join("\n");
      return `${marker} ${indented}`;
    })
    .join("\n");
}

function renderCodeBlock(node: JSONContent): string {
  const code = (node.content ?? []).map((child) => child.text ?? "").join("");
  const longest = Math.max(0, ...(code.match(/`{3,}/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longest + 1));
  const language = String(node.attrs?.language ?? "").replace(/[`\s]/g, "");
  return code ? `${fence}${language}\n${code}\n${fence}` : `${fence}${language}\n${fence}`;
}

function renderInline(nodes: JSONContent[], inHeading: boolean): string {
  let out = "";
  let lineStart = true;
  const open: Mark[] = [];

  const closeTo = (keep: Mark[]) => {
    let shared = 0;
    while (shared < open.length && shared < keep.length && sameMark(open[shared], keep[shared])) {
      shared++;
    }
    while (open.length > shared) out += closeDelimiter(open.pop()!);
  };

  nodes.forEach((node, index) => {
    if (node.type === "hardBreak") {
      closeTo([]);
      out += inHeading ? " " : "\n";
      lineStart = !inHeading;
      return;
    }
    if (node.type !== "text" || !node.text) return;

    const marks = sortMarks(node.marks ?? []);
    if (marks.some((mark) => mark.type === "code")) {
      closeTo(marks.filter((mark) => mark.type === "link"));
      openMissing(marks.filter((mark) => mark.type === "link"));
      out += codeSpan(node.text);
      lineStart = false;
      return;
    }

    const [, lead, core, trail] = /^(\s*)(.*?)(\s*)$/s.exec(node.text)!;
    closeTo(marks);
    out += lead;
    if (core) {
      openMissing(marks);
      out += escapeText(core, lineStart, inHeading);
      lineStart = false;
    }
    if (trail) {
      closeTo(sortMarks(nodes[index + 1]?.marks ?? []));
      out += trail;
    }
  });
  closeTo([]);
  return out;

  function openMissing(marks: Mark[]) {
    for (const mark of marks.slice(open.length)) {
      out += openDelimiter(mark);
      open.push(mark);
      lineStart = false;
    }
  }
}

function sortMarks(marks: Mark[]): Mark[] {
  return marks
    .filter((mark) => mark.type === "code" || MARK_ORDER.includes(mark.type))
    .sort((a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type));
}

function sameMark(a: Mark, b: Mark): boolean {
  return a.type === b.type && a.attrs?.href === b.attrs?.href;
}

function openDelimiter(mark: Mark): string {
  return { link: "[", bold: "**", italic: "*", underline: "<u>" }[mark.type] ?? "";
}

function closeDelimiter(mark: Mark): string {
  if (mark.type === "link") return `](${encodeHref(String(mark.attrs?.href ?? ""))})`;
  return { bold: "**", italic: "*", underline: "</u>" }[mark.type] ?? "";
}

function encodeHref(href: string): string {
  return href.replace(/[\s<>]/g, (char) => encodeURIComponent(char)).replace(/[()\\]/g, "\\$&");
}

function codeSpan(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const ticks = "`".repeat(longest + 1);
  const pad = /^[` ]|[` ]$/.test(text) && text.trim() !== "" ? " " : "";
  return `${ticks}${pad}${text}${pad}${ticks}`;
}

function escapeText(text: string, lineStart: boolean, inHeading: boolean): string {
  let out = text
    .replace(inHeading ? /[\\`*_[\]#]/g : /[\\`*_[\]]/g, "\\$&")
    .replace(/&(?=#?\w+;)/g, "\\&")
    .replace(/<(?=[a-zA-Z/!?])/g, "&lt;");
  if (lineStart) {
    out = out.replace(/^([#>+=~-])/, "\\$1").replace(/^(\d+)([.)])/, "$1\\$2");
  }
  return out;
}
