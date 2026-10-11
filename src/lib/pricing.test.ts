import { describe, expect, it } from "vitest";
import { orderTotal, seatsLeft } from "./pricing";

describe("ticket rules", () => {
  it("total is price times quantity", () => {
    expect(orderTotal(49, 3)).toBe(147);
  });
  it("rejects more than 10 tickets per order", () => {
    expect(() => orderTotal(49, 11)).toThrow();
  });
  it("rejects zero tickets", () => {
    expect(() => orderTotal(49, 0)).toThrow();
  });
  it("seats left never goes negative", () => {
    expect(seatsLeft(100, 120)).toBe(0);
    expect(seatsLeft(100, 40)).toBe(60);
  });
});
