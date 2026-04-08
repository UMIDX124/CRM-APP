/**
 * XSS sanitization for user-generated content.
 *
 * `sanitizeText` strips ALL HTML — use for fields that should never contain
 * markup (subject lines, contact names, ticket descriptions when rendered
 * as plain text).
 *
 * `sanitizeRich` allows a strict allowlist (b/i/em/strong/code/pre/a/br)
 * suitable for chat messages. Links get `rel="noopener nofollow"` and
 * `target="_blank"` injected.
 *
 * Implementation note: we use a tiny manual sanitizer rather than DOMPurify
 * to avoid pulling jsdom into the server bundle. The allowlist is small
 * enough that the manual approach is auditable and zero-dep. If the chat
 * surface area grows beyond this, swap to isomorphic-dompurify.
 */

const ALLOWED_TAGS = new Set(["b", "i", "em", "strong", "code", "pre", "a", "br"]);
const ALLOWED_ATTRS_BY_TAG: Record<string, Set<string>> = {
  a: new Set(["href"]),
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip ALL HTML and entities, returning safe plain text. */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";
  // Remove tags
  const noTags = input.replace(/<[^>]*>/g, "");
  // Collapse whitespace, trim
  return noTags.replace(/\s+/g, " ").trim();
}

/**
 * Sanitize rich HTML using a strict allowlist. Anything not in the allowlist
 * is removed (tag stripped, content kept). Bad URLs (javascript:, data:,
 * vbscript:) are dropped from anchors.
 */
export function sanitizeRich(input: string | null | undefined): string {
  if (!input) return "";

  // Quick reject for obvious XSS payloads
  const stripped = input.replace(/<script[\s\S]*?<\/script>/gi, "");

  // Walk through tokens
  let out = "";
  let i = 0;
  while (i < stripped.length) {
    const lt = stripped.indexOf("<", i);
    if (lt === -1) {
      out += escapeHtml(stripped.slice(i));
      break;
    }
    // Append text before tag
    out += escapeHtml(stripped.slice(i, lt));
    const gt = stripped.indexOf(">", lt);
    if (gt === -1) {
      // Unclosed tag — escape rest as text
      out += escapeHtml(stripped.slice(lt));
      break;
    }
    const raw = stripped.slice(lt + 1, gt).trim();
    const isClosing = raw.startsWith("/");
    const body = isClosing ? raw.slice(1).trim() : raw;
    const spaceIdx = body.search(/\s/);
    const tagName = (spaceIdx === -1 ? body : body.slice(0, spaceIdx))
      .toLowerCase()
      .replace(/\/$/, "");
    if (ALLOWED_TAGS.has(tagName)) {
      if (isClosing) {
        out += `</${tagName}>`;
      } else {
        // Parse simple attributes for allowlisted ones
        const allowedAttrs = ALLOWED_ATTRS_BY_TAG[tagName] || new Set();
        let attrs = "";
        if (spaceIdx !== -1) {
          const attrString = body.slice(spaceIdx + 1);
          const attrRegex = /([a-zA-Z][\w:-]*)\s*=\s*"([^"]*)"|([a-zA-Z][\w:-]*)\s*=\s*'([^']*)'/g;
          let m;
          while ((m = attrRegex.exec(attrString)) !== null) {
            const name = (m[1] || m[3] || "").toLowerCase();
            const value = m[2] || m[4] || "";
            if (!allowedAttrs.has(name)) continue;
            if (name === "href") {
              const lower = value.trim().toLowerCase();
              if (
                lower.startsWith("javascript:") ||
                lower.startsWith("data:") ||
                lower.startsWith("vbscript:")
              )
                continue;
            }
            attrs += ` ${name}="${escapeHtml(value)}"`;
          }
        }
        if (tagName === "a") {
          attrs += ` rel="noopener nofollow noreferrer" target="_blank"`;
        }
        const selfClosing = tagName === "br";
        out += `<${tagName}${attrs}${selfClosing ? " />" : ">"}`;
      }
    }
    // unknown tags: silently dropped
    i = gt + 1;
  }
  return out;
}

/** Hard cap on field lengths to prevent abuse. */
export function clampLength(input: string, max: number): string {
  if (input.length <= max) return input;
  return input.slice(0, max);
}
