"use client";

// Small purpose-built markdown renderer for second-brain notes.
// Supports: headings, blockquotes, lists, tables, bold/italic/code,
// [[wikilinks]] (resolved via onNavigate), #code/ tags, hr.

import { Fragment, type ReactNode } from "react";

export interface MarkdownProps {
  text: string;
  /** slug (lowercase) -> exists? Used to style resolvable wikilinks. */
  resolve?: (target: string) => boolean;
  onNavigate?: (target: string) => void;
}

function renderInline(
  text: string,
  resolve?: (t: string) => boolean,
  onNavigate?: (t: string) => void
): ReactNode[] {
  const out: ReactNode[] = [];
  // tokenize wikilinks, bold, italics, inline code, code-tags
  const re =
    /\[\[([^\]|#]+)(?:[|#]([^\]]*))?\]\]|\*\*([^*]+)\*\*|`([^`]+)`|(#code\/[\w./-]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      const target = m[1].trim();
      const label = (m[2] || target).trim();
      const ok = resolve ? resolve(target) : false;
      out.push(
        ok ? (
          <button
            key={key++}
            type="button"
            onClick={() => onNavigate?.(target)}
            className="cursor-pointer rounded bg-blue-50 px-1 font-medium text-[#004a99] underline decoration-blue-300 underline-offset-2 hover:bg-blue-100"
          >
            {label}
          </button>
        ) : (
          <span key={key++} className="rounded bg-neutral-100 px-1 text-neutral-500">
            {label}
          </span>
        )
      );
    } else if (m[3] !== undefined) {
      out.push(<strong key={key++}>{renderInline(m[3], resolve, onNavigate)}</strong>);
    } else if (m[4] !== undefined) {
      out.push(
        <code key={key++} className="rounded bg-neutral-100 px-1 py-0.5 text-[0.85em]">
          {m[4]}
        </code>
      );
    } else if (m[5] !== undefined) {
      out.push(
        <span
          key={key++}
          className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[0.8em] font-medium text-slate-600"
        >
          {m[5].replace("#code/", "")}
        </span>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Markdown({ text, resolve, onNavigate }: MarkdownProps) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const inline = (t: string) => renderInline(t, resolve, onNavigate);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const cls =
        level === 1
          ? "text-xl font-bold text-neutral-900 mt-2"
          : level === 2
            ? "text-base font-bold text-neutral-900 mt-5"
            : "text-sm font-bold text-neutral-800 mt-4";
      blocks.push(
        <div key={key++} className={cls}>
          {inline(h[2])}
        </div>
      );
      i++;
      continue;
    }

    // hr
    if (/^-{3,}\s*$/.test(line)) {
      blocks.push(<hr key={key++} className="my-4 border-neutral-200" />);
      i++;
      continue;
    }

    // blockquote (+ optional Code: line after)
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      let code: string | undefined;
      if (i < lines.length) {
        const cm = lines[i].match(/^Code:\s*(#code\/[\w./-]+)/i);
        if (cm) {
          code = cm[1];
          i++;
        }
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-3 rounded-r-lg border-l-4 border-[#0a5cd5] bg-blue-50/60 px-4 py-2.5 text-[0.925rem] italic leading-relaxed text-neutral-700"
        >
          {inline(quote.join(" "))}
          {code && (
            <div className="mt-1.5 not-italic">
              <span className="inline-block rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                {code.replace("#code/", "")}
              </span>
            </div>
          )}
        </blockquote>
      );
      continue;
    }

    // table
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i]
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
        // tolerate blank lines between table rows (loose exports)
        while (
          i < lines.length &&
          !lines[i].trim() &&
          lines[i + 1]?.trim().startsWith("|")
        ) {
          i++;
        }
      }
      if (rows.length) {
        blocks.push(
          <div key={key++} className="my-3 overflow-x-auto">
            <table className="w-full min-w-[400px] border-collapse text-sm">
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri} className={ri === 0 ? "" : "border-t border-neutral-100"}>
                    {r.map((c, ci) => (
                      <td key={ci} className="px-3 py-2 align-top text-neutral-700">
                        {inline(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // list
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-2 space-y-1.5 pl-1">
          {items.map((it, ix) => (
            <li key={ix} className="flex gap-2 text-[0.925rem] leading-relaxed text-neutral-700">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0a5cd5]" />
              <span>{inline(it)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // paragraph (merge consecutive plain lines; **Label:** lines stay separate)
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s|>|\||\s*[-*]\s|\s*\d+\.\s|-{3,}\s*$|\*\*[^*]+\*\*)/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-2 text-[0.925rem] leading-relaxed text-neutral-700">
        {para.map((p, pi) => (
          <Fragment key={pi}>
            {pi > 0 && " "}
            {inline(p)}
          </Fragment>
        ))}
      </p>
    );
  }

  return <div>{blocks}</div>;
}
