import { Fragment } from "react";

/**
 * Minimal, safe markdown renderer for advisor replies. Renders to React nodes
 * (never innerHTML) so it can't inject markup. Handles the subset the model
 * actually emits: paragraphs, `-`/`*` bullet lists and **bold** spans.
 */
function renderInline(text: string, keyPrefix: string) {
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
