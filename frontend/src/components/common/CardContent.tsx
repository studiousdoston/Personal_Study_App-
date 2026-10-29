import type { KeyboardEvent, MouseEvent } from "react";
import Markdown, { type Components } from "react-markdown";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import type { Nodes, Root } from "mdast";
import { remarkUnderline } from "../../utils/remarkUnderline";
import styles from "./CardContent.module.css";

type CardContentProps = {
  markdown: string;
  variant: "full" | "compact";
};

const UPLOAD_SRC = /^\/uploads\/[0-9a-f]{32}\.webp$/;

const schema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "h1",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "code",
    "pre",
    "a",
    "img",
    "blockquote",
  ],
  attributes: {
    a: ["href"],
    img: ["src", "alt"],
    code: [["className", /^language-/]],
  },
  protocols: {
    href: ["http", "https"],
    src: ["http", "https"],
  },
  strip: [
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "noscript",
    "template",
    "textarea",
    "title",
  ],
  ancestors: {},
  required: {},
};

function capHeadings(node: Nodes) {
  if (node.type === "heading" && node.depth > 3) node.depth = 3;
  if ("children" in node) node.children.forEach(capHeadings);
}

function remarkCapHeadings() {
  return (tree: Root) => capHeadings(tree);
}

function stopFlip(e: MouseEvent | KeyboardEvent) {
  e.stopPropagation();
}

const components: Components = {
  h1: ({ children }) => <p className={`${styles.heading} ${styles.h1}`}>{children}</p>,
  h2: ({ children }) => <p className={`${styles.heading} ${styles.h2}`}>{children}</p>,
  h3: ({ children }) => <p className={`${styles.heading} ${styles.h3}`}>{children}</p>,
  a: ({ href, children }) =>
    href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={stopFlip}
        onKeyDown={stopFlip}
      >
        {children}
      </a>
    ) : (
      <>{children}</>
    ),
  img: ({ src, alt }) =>
    typeof src === "string" && UPLOAD_SRC.test(src) ? (
      <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" className={styles.image} />
    ) : null,
};

export function CardContent({ markdown, variant }: CardContentProps) {
  return (
    <div className={`${styles.content} ${styles[variant]}`}>
      <Markdown
        remarkPlugins={[remarkCapHeadings, remarkUnderline]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={components}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
