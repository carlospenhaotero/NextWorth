import { Fragment } from "react";
import Link from "next/link";

/**
 * Minimal, safe markdown renderer for advisor replies. Renders to React nodes
 * (never innerHTML) so it can't inject markup. Handles the subset the model
 * actually emits: paragraphs, `-`/`*` bullet lists, **bold** spans and
 * internal navigation links `[text](/route)`.
 */

// Only these in-app routes may ever be rendered as a link. The model's
// output is untrusted, so anything that doesn't match stays as plain text.
const ALLOWED_LINK_PATTERNS = [
  /^\/overview$/,
  /^\/assets$/,
  /^\/assets\/[A-Za-z0-9.\-]+$/,
  /^\/add-asset$/,
  /^\/advisor$/,
  /^\/settings$/,
];

function isAllowedInternalHref(href: string): boolean {
  // Reject anything that isn't a plain root-relative path: protocol-relative
  // ("//evil.com"), backslash tricks, or query/hash-only strings that could
  // hide a scheme are all excluded by requiring a single leading "/".
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  return ALLOWED_LINK_PATTERNS.some((pattern) => pattern.test(href));
}

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

function renderInline(text: string, keyPrefix: string) {
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let linkIndex = 0;

  LINK_RE.lastIndex = 0;
  while ((match = LINK_RE.exec(text)) !== null) {
    const [full, label, href] = match;
    if (match.index > lastIndex) {
      segments.push(renderBold(text.slice(lastIndex, match.index), `${keyPrefix}-t${linkIndex}`));
    }
    if (isAllowedInternalHref(href)) {
      segments.push(
        <Link
          key={`${keyPrefix}-l${linkIndex}`}
          href={href}
          className="text-accent-hover underline decoration-transparent underline-offset-2 transition-colors hover:decoration-current outline-none focus-visible:ring-2 focus-visible:ring-accent-ring rounded-sm"
        >
          {label}
        </Link>,
      );
    } else {
      // Href isn't in the whitelist: fall back to plain text (still show the label).
      segments.push(<Fragment key={`${keyPrefix}-l${linkIndex}`}>{label}</Fragment>);
    }
    lastIndex = match.index + full.length;
    linkIndex += 1;
  }
  if (lastIndex < text.length) {
    segments.push(renderBold(text.slice(lastIndex), `${keyPrefix}-t${linkIndex}`));
  }
  return segments;
}

function renderBold(text: string, keyPrefix: string) {
  // Split on **bold** while keeping the delimiters' content.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-white">
          {bold[1]}
        </strong>
      );
    }
    return <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>;
  });
}

export function ChatMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = (key: string) => {
    if (list.length === 0) return;
    const items = list;
    list = [];
    blocks.push(
      <ul key={key} className="list-disc space-y-1 pl-5">
        {items.map((item, i) => (
          <li key={i}>{renderInline(item, `${key}-${i}`)}</li>
        ))}
      </ul>,
    );
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flushList(`ul-${i}`);
    if (line.trim() === "") return;
    blocks.push(
      <p key={`p-${i}`} className="leading-relaxed">
        {renderInline(line, `p-${i}`)}
      </p>,
    );
  });
  flushList("ul-end");

  return <div className="space-y-2">{blocks}</div>;
}
