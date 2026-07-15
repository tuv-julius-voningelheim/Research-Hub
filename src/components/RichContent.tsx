"use client";

// Renders sanitized rich-text HTML (report blocks). Also accepts legacy
// markdown-ish strings and shows them as plain paragraphs.

import { looksLikeHtml, sanitizeHtml } from "@/lib/richtext";

export default function RichContent({ html }: { html: string }) {
  if (!html?.trim()) return null;
  if (!looksLikeHtml(html)) {
    return (
      <div className="richtext">
        {html.split(/\n{2,}/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    );
  }
  return (
    <div
      className="richtext"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
