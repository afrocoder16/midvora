// Money is stored and computed in integer cents everywhere to avoid
// floating-point rounding errors. Convert to/from display strings only at edges.

/** Parse a user-entered dollar string (e.g. "1,250.00") into integer cents. */
export function dollarsToCents(input: string | number): number {
  if (typeof input === "number") {
    return Math.round(input * 100);
  }
  const cleaned = input.replace(/[^0-9.-]/g, "");
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

/** Format integer cents as a USD string, e.g. 125000 -> "$1,250.00". */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Sum the line-item prices (already in cents) into a total in cents. */
export function sumLineItems(items: { price: number }[]): number {
  return items.reduce((acc, item) => acc + (Number.isFinite(item.price) ? item.price : 0), 0);
}
