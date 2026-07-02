import { describe, expect, it } from "vitest";
import {
  buildCustomHtmlDocument,
  CUSTOM_HTML_CSP,
  sanitizeCustomCss,
  sanitizeCustomHtmlContent,
} from "../lib/custom-html";
import { DEFAULT_TEMPLATE_CONTENT } from "../lib/proposal-content";
import { createProposalSchema, signProposalSchema } from "../lib/validation";

const tinyPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l8Qk1wAAAABJRU5ErkJggg==";

describe("createProposalSchema", () => {
  it("trims and sanitizes proposal fields", () => {
    const parsed = createProposalSchema.parse({
      proposal_kind: "template",
      client_name: "  Jane Doe\u0000 ",
      client_business: "  Jane's Bakery\u0007 ",
      client_email: " jane@example.com ",
      proposal_content: DEFAULT_TEMPLATE_CONTENT,
      line_items: [{ description: "  Website build\u0001 ", price: 250000 }],
    });

    expect(parsed.client_name).toBe("Jane Doe");
    expect(parsed.client_business).toBe("Jane's Bakery");
    expect(parsed.client_email).toBe("jane@example.com");
    expect(parsed.proposal_kind).toBe("template");
    expect(parsed.brand_primary).toBe("#1F5D2B");
    expect(parsed.line_items[0].description).toBe("Website build");
  });

  it("accepts custom HTML/CSS without guided fields or a total", () => {
    const parsed = createProposalSchema.parse({
      proposal_kind: "custom_html",
      client_name: "Jane Doe",
      client_email: "jane@example.com",
      proposal_title: "Custom Agreement",
      proposal_content: {
        page_title: "Custom Agreement",
        html: "<main><h1>Proposal</h1></main>",
        css: "body { color: #111111; }",
      },
      line_items: [],
    });

    expect(parsed.proposal_kind).toBe("custom_html");
    expect(parsed.line_items).toEqual([]);
  });

  it("requires HTML and CSS for custom HTML proposals", () => {
    const result = createProposalSchema.safeParse({
      proposal_kind: "custom_html",
      client_name: "Jane Doe",
      client_email: "jane@example.com",
      proposal_content: {
        page_title: "Custom Agreement",
        html: "",
        css: "",
      },
      line_items: [],
    });

    expect(result.success).toBe(false);
  });

  it("accepts uploaded PDF proposal metadata", () => {
    const parsed = createProposalSchema.parse({
      proposal_kind: "uploaded_pdf",
      client_name: "Jane Doe",
      client_email: "jane@example.com",
      brand_primary: "#245C32",
      brand_accent: "#E86B2A",
      proposal_title: "Custom Agreement",
      line_items: [],
    });

    expect(parsed.proposal_kind).toBe("uploaded_pdf");
    expect(parsed.proposal_title).toBe("Custom Agreement");
  });

  it("defaults omitted proposal kind to uploaded PDF", () => {
    const parsed = createProposalSchema.parse({
      client_name: "Jane Doe",
      client_email: "jane@example.com",
      line_items: [],
    });

    expect(parsed.proposal_kind).toBe("uploaded_pdf");
  });

  it("rejects invalid brand colors", () => {
    const result = createProposalSchema.safeParse({
      proposal_kind: "template",
      client_name: "Jane Doe",
      client_email: "jane@example.com",
      brand_primary: "green",
      line_items: [{ description: "Website build", price: 250000 }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects blank described line items when provided", () => {
    const result = createProposalSchema.safeParse({
      proposal_kind: "template",
      client_name: "Jane Doe",
      client_email: "jane@example.com",
      line_items: [{ description: "   ", price: 250000 }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid email and non-integer cents", () => {
    const result = createProposalSchema.safeParse({
      proposal_kind: "template",
      client_name: "Jane Doe",
      client_email: "not-email",
      line_items: [{ description: "Website build", price: 12.5 }],
    });

    expect(result.success).toBe(false);
  });
});

describe("custom HTML sanitization", () => {
  it("strips scripts, event handlers, forms, frames, and unsafe image sources", () => {
    const sanitized = sanitizeCustomHtmlContent({
      page_title: "Unsafe",
      html: `
        <main onclick="alert(1)">
          <script>alert(1)</script>
          <iframe src="https://example.com"></iframe>
          <form><input name="x" /></form>
          <img src="https://example.com/logo.png" onerror="alert(1)" />
          <img src="data:image/png;base64,abc" alt="ok" />
        </main>`,
      css: "body { color: red; }",
    });

    expect(sanitized.html).not.toContain("script");
    expect(sanitized.html).not.toContain("onclick");
    expect(sanitized.html).not.toContain("iframe");
    expect(sanitized.html).not.toContain("form");
    expect(sanitized.html).not.toContain("https://example.com/logo.png");
    expect(sanitized.html).toContain("data:image/png;base64,abc");
  });

  it("strips unsafe CSS imports and remote urls", () => {
    const sanitized = sanitizeCustomCss(`
      @import url("https://example.com/style.css");
      body { background: url("https://example.com/bg.png"); color: red; }
      a { background-image: url("data:image/png;base64,abc"); }
      div { behavior: url(test.htc); }
    `);

    expect(sanitized).not.toContain("@import");
    expect(sanitized).not.toContain("https://example.com");
    expect(sanitized).not.toContain("behavior");
    expect(sanitized).toContain("data:image/png;base64,abc");
  });

  it("builds a CSP-protected document with client placeholders", () => {
    const html = buildCustomHtmlDocument(
      {
        page_title: "Custom",
        html: "<main><h1>{{client_business}}</h1><img src=\"{{client_logo_url}}\" /></main>",
        css: "h1 { color: var(--midvora-client-primary); }",
      },
      {
        title: "Custom",
        token: "abc123",
        clientName: "Jane Doe",
        clientBusiness: "Jane Bakery",
        brandPrimary: "#245C32",
        brandAccent: "#E86B2A",
      }
    );

    expect(html).toContain(CUSTOM_HTML_CSP);
    expect(html).toContain("Jane Bakery");
    expect(html).toContain("/api/proposal/abc123/logo");
    expect(html).not.toContain("<script");
  });
});

describe("signProposalSchema", () => {
  it("accepts a valid signature payload", () => {
    const parsed = signProposalSchema.parse({
      token: "abc123",
      signer_name: " Jane Doe ",
      agreed: true,
      signature_image: tinyPngDataUrl,
    });

    expect(parsed.signer_name).toBe("Jane Doe");
  });

  it("requires agreement and a PNG data URL", () => {
    const result = signProposalSchema.safeParse({
      token: "abc123",
      signer_name: "Jane Doe",
      agreed: false,
      signature_image: "data:image/jpeg;base64,abc",
    });

    expect(result.success).toBe(false);
  });
});
