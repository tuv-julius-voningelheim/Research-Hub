// Helpers for the rich text editor (report blocks). Content is stored as a
// small, sanitized HTML subset. These functions work on both server and
// client (regex-based) so report/share/export render consistently.

const ALLOWED = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
]);

/** strip scripts, event handlers and any tag outside the allow-list */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  let out = html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/ on[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/ on[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
  // drop any tag not in the allow-list (keep its inner content)
  out = out.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (m, tag) => {
    const t = String(tag).toLowerCase();
    if (!ALLOWED.has(t)) return "";
    if (t === "a") {
      // keep only a safe href
      const href = m.match(/href\s*=\s*"([^"]*)"/i)?.[1];
      if (m.startsWith("</")) return "</a>";
      return href && /^(https?:|mailto:|\/)/i.test(href)
        ? `<a href="${href}" target="_blank" rel="noopener noreferrer">`
        : "<a>";
    }
    // strip all attributes from other tags
    return m.startsWith("</") ? `</${t}>` : `<${t}>`;
  });
  return out.trim();
}

/** true if the string already contains HTML markup */
export function looksLikeHtml(s: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

/** convert the stored HTML subset to markdown (for the .md export) */
export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  if (!looksLikeHtml(html)) return html;
  let s = html;
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, c) => `\n## ${strip(c)}\n\n`);
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, c) => `\n### ${strip(c)}\n\n`);
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, c) => `**${strip(c)}**`);
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, c) => `_${strip(c)}_`);
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, c) => `\n> ${strip(c)}\n\n`);
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, c) => `- ${strip(c)}\n`);
  s = s.replace(/<\/(ul|ol)>/gi, "\n");
  s = s.replace(/<(ul|ol)[^>]*>/gi, "\n");
  s = s.replace(/<a[^>]*href\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, h, c) => `[${strip(c)}](${h})`);
  s = s.replace(/<\/p>/gi, "\n\n").replace(/<p[^>]*>/gi, "");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = strip(s);
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

function strip(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
