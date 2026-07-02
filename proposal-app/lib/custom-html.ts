import sanitizeHtml from "sanitize-html";
import { DEFAULT_CUSTOM_HTML_CONTENT } from "@/lib/proposal-content";
import type { ProposalCustomHtmlContent } from "@/lib/types";

export const CUSTOM_HTML_CSP = [
  "default-src 'none'",
  "script-src 'none'",
  "style-src 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src data:",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
].join("; ");

interface CustomHtmlDocumentOptions {
  title?: string;
  token?: string;
  clientName?: string;
  clientBusiness?: string | null;
  clientAddress?: string | null;
  clientEmail?: string | null;
  logoUrl?: string | null;
  brandPrimary?: string;
  brandAccent?: string;
  extraCss?: string;
  extraBodyHtml?: string;
}

const SAFE_RESET_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html { background: #f8f6f2; color: #111827; }
  body { min-height: 100vh; }
  img, svg, video, canvas { max-width: 100%; }
  table { max-width: 100%; }
  a { color: inherit; }
  @media screen {
    body { margin: 0; }
  }
`;

const allowedTags = [
  ...sanitizeHtml.defaults.allowedTags,
  "address",
  "article",
  "aside",
  "caption",
  "col",
  "colgroup",
  "details",
  "figcaption",
  "figure",
  "footer",
  "header",
  "main",
  "mark",
  "picture",
  "section",
  "small",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "img",
].filter((tag) => !["form", "iframe", "script", "style"].includes(tag));

export function sanitizeCustomHtmlContent(
  input: ProposalCustomHtmlContent
): ProposalCustomHtmlContent {
  const pageTitle = cleanText(input.page_title, DEFAULT_CUSTOM_HTML_CONTENT.page_title, 200);
  const css = sanitizeCustomCss(input.css);
  const html = sanitizeCustomHtml(input.html);

  return {
    page_title: pageTitle,
    html,
    css,
  };
}

export function buildCustomHtmlDocument(
  input: ProposalCustomHtmlContent,
  options: CustomHtmlDocumentOptions = {}
): string {
  const htmlWithVariables = applyCustomHtmlVariables(extractBodyMarkup(input.html), options);
  const sanitized = sanitizeCustomHtmlContent({ ...input, html: htmlWithVariables });
  const title = escapeHtml(options.title || sanitized.page_title);
  const brandPrimary = safeHex(options.brandPrimary, "#1F5D2B");
  const brandAccent = safeHex(options.brandAccent, "#F96B2B");
  const extraCss = options.extraCss ? sanitizeCustomCss(options.extraCss) : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Security-Policy" content="${CUSTOM_HTML_CSP}" />
  <title>${title}</title>
  <style>${SAFE_RESET_CSS}</style>
  <style>
    :root {
      --midvora-client-primary: ${brandPrimary};
      --midvora-client-accent: ${brandAccent};
    }
  </style>
  <style>${sanitized.css}</style>
  ${extraCss ? `<style>${extraCss}</style>` : ""}
</head>
<body>
${sanitized.html}
${options.extraBodyHtml ?? ""}
</body>
</html>`;
}

export function sanitizeCustomCss(input: string): string {
  return input
    .replace(/<\/?style\b[^>]*>/gi, "")
    .replace(/@import\s+(?:url\()?[^;]+;?/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/behaviou?r\s*:[^;]+;?/gi, "")
    .replace(/-moz-binding\s*:[^;]+;?/gi, "")
    .replace(/url\s*\(\s*(['"]?)(?!data:image\/|\/api\/proposal\/|#)([^'")]+)\1\s*\)/gi, "none")
    .trim();
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeCustomHtml(input: string): string {
  return sanitizeHtml(extractBodyMarkup(input), {
    allowedTags,
    allowedAttributes: {
      "*": [
        "aria-label",
        "aria-describedby",
        "aria-hidden",
        "class",
        "data-*",
        "id",
        "role",
        "style",
        "title",
      ],
      a: ["href", "name", "rel", "target", "title", "class", "id", "style"],
      col: ["span", "width", "class", "id", "style"],
      colgroup: ["span", "width", "class", "id", "style"],
      img: ["alt", "class", "height", "id", "loading", "src", "style", "title", "width"],
      ol: ["class", "id", "reversed", "start", "style", "type"],
      table: ["class", "id", "style", "summary"],
      td: ["class", "colspan", "headers", "id", "rowspan", "style"],
      th: ["abbr", "class", "colspan", "headers", "id", "rowspan", "scope", "style"],
      ul: ["class", "id", "style", "type"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel", "data"],
    allowProtocolRelative: false,
    transformTags: {
      "*": (tagName, attribs) => {
        const safeAttributes = { ...attribs };

        for (const key of Object.keys(safeAttributes)) {
          if (/^on/i.test(key)) delete safeAttributes[key];
        }

        if (safeAttributes.style) {
          const cleanStyle = sanitizeCustomCss(safeAttributes.style).replace(/[{}]/g, "");
          if (cleanStyle) safeAttributes.style = cleanStyle;
          else delete safeAttributes.style;
        }

        if (tagName === "a") {
          safeAttributes.rel = "noopener noreferrer";
        }

        if (tagName === "img") {
          const src = safeAttributes.src ?? "";
          if (!isAllowedImageSrc(src)) delete safeAttributes.src;
        }

        return { tagName, attribs: safeAttributes };
      },
    },
    exclusiveFilter(frame) {
      return frame.tag === "img" && !frame.attribs.src;
    },
  });
}

function extractBodyMarkup(input: string): string {
  const bodyMatch = input.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : input;

  return body
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<head\b[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?(?:html|body)\b[^>]*>/gi, "");
}

function applyCustomHtmlVariables(html: string, options: CustomHtmlDocumentOptions): string {
  const business = options.clientBusiness || options.clientName || "";
  const logoUrl =
    options.logoUrl ??
    (options.token ? `/api/proposal/${encodeURIComponent(options.token)}/logo` : "");
  const values: Record<string, string> = {
    "{{client_name}}": escapeHtml(options.clientName ?? ""),
    "{{client_business}}": escapeHtml(business),
    "{{client_address}}": escapeHtml(options.clientAddress ?? ""),
    "{{client_email}}": escapeHtml(options.clientEmail ?? ""),
    "{{client_logo_url}}": logoUrl,
    "{{brand_primary}}": safeHex(options.brandPrimary, "#1F5D2B"),
    "{{brand_accent}}": safeHex(options.brandAccent, "#F96B2B"),
  };

  return Object.entries(values).reduce(
    (result, [placeholder, value]) => result.split(placeholder).join(value),
    html
  );
}

function isAllowedImageSrc(src: string): boolean {
  const value = src.trim();
  return (
    value === "{{client_logo_url}}" ||
    /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,/i.test(value) ||
    /^\/api\/proposal\/[^/]+\/logo(?:\?.*)?$/i.test(value)
  );
}

function cleanText(value: string, fallback: string, max: number): string {
  const trimmed = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  return trimmed.length > 0 ? trimmed.slice(0, max) : fallback;
}

function safeHex(value: string | undefined, fallback: string): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}
