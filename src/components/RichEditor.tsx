"use client";

// Lightweight WYSIWYG editor (contentEditable) with a formatting toolbar:
// headings, bold, italic, underline, lists, quote, link. Emits sanitized
// HTML. No external dependencies.

import { useEffect, useRef, useState } from "react";
import { sanitizeHtml } from "@/lib/richtext";

interface ToolButton {
  key: string;
  label: React.ReactNode;
  title: string;
  cmd: string;
  value?: string;
  block?: boolean; // formatBlock toggle
}

const BUTTONS: (ToolButton | "sep")[] = [
  { key: "h2", label: "H2", title: "Überschrift", cmd: "formatBlock", value: "h2", block: true },
  { key: "h3", label: "H3", title: "Unterüberschrift", cmd: "formatBlock", value: "h3", block: true },
  "sep",
  { key: "bold", label: <b>B</b>, title: "Fett", cmd: "bold" },
  { key: "italic", label: <i>I</i>, title: "Kursiv", cmd: "italic" },
  { key: "underline", label: <u>U</u>, title: "Unterstrichen", cmd: "underline" },
  "sep",
  {
    key: "ul",
    label: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
    title: "Aufzählung",
    cmd: "insertUnorderedList",
  },
  {
    key: "ol",
    label: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
      </svg>
    ),
    title: "Nummerierte Liste",
    cmd: "insertOrderedList",
  },
  {
    key: "quote",
    label: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21c3-1 5-3.5 5-7V7a3 3 0 0 0-3-3H4a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h2" />
      </svg>
    ),
    title: "Zitat",
    cmd: "formatBlock",
    value: "blockquote",
    block: true,
  },
];

export default function RichEditor({
  html,
  onChange,
  placeholder,
}: {
  html: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  // initialise once — never write back from props (avoids cursor jumps)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (html || "")) {
      ref.current.innerHTML = html || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => onChange(sanitizeHtml(ref.current?.innerHTML ?? ""));

  const run = (b: ToolButton) => {
    ref.current?.focus();
    if (b.block) {
      // toggle heading/quote off if already applied
      const current = document.queryCommandValue("formatBlock")?.toLowerCase();
      document.execCommand("formatBlock", false, current === b.value ? "p" : b.value!);
    } else {
      document.execCommand(b.cmd, false, b.value);
    }
    emit();
  };

  const addLink = () => {
    const url = window.prompt("Link-URL:");
    if (!url) return;
    ref.current?.focus();
    document.execCommand("createLink", false, url);
    emit();
  };

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-white transition-colors ${
        focused ? "border-[#0057b8] ring-4 ring-blue-600/10" : "border-neutral-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 bg-neutral-50 px-1.5 py-1">
        {BUTTONS.map((b, i) =>
          b === "sep" ? (
            <span key={i} className="mx-1 h-5 w-px bg-neutral-200" />
          ) : (
            <button
              key={b.key}
              type="button"
              title={b.title}
              onMouseDown={(e) => {
                e.preventDefault();
                run(b);
              }}
              className="flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
            >
              {b.label}
            </button>
          )
        )}
        <button
          type="button"
          title="Link"
          onMouseDown={(e) => {
            e.preventDefault();
            addLink();
          }}
          className="flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        data-placeholder={placeholder}
        className="richtext min-h-[140px] px-3.5 py-2.5 text-sm leading-relaxed text-neutral-800 outline-none"
      />
    </div>
  );
}
