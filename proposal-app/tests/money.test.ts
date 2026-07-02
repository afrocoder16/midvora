import { describe, expect, it } from "vitest";
import { dollarsToCents, formatCents, sumLineItems } from "../lib/money";

describe("money helpers", () => {
  it("parses dollar input into integer cents", () => {
    expect(dollarsToCents("$1,250.50")).toBe(125050);
    expect(dollarsToCents("99")).toBe(9900);
    expect(dollarsToCents("12.345")).toBe(1235);
  });

  it("falls back to zero for non-numeric input", () => {
    expect(dollarsToCents("")).toBe(0);
    expect(dollarsToCents("not a price")).toBe(0);
  });

  it("formats integer cents as USD", () => {
    expect(formatCents(125050)).toBe("$1,250.50");
  });

  it("sums finite line-item prices only", () => {
    expect(sumLineItems([{ price: 1000 }, { price: Number.NaN }, { price: 2500 }])).toBe(3500);
  });
});
