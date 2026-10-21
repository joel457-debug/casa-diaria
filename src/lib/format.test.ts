import { describe, it, expect } from "vitest";
import { formatPrice, slugify, BIO_MAX } from "./format";

describe("format", () => {
  it("bio limit is 3000 characters", () => expect(BIO_MAX).toBe(3000));
  it("consulta shows no price", () => expect(formatPrice("consulta", 50)).toBe("Orçamento sob consulta"));
  it("inicial prefix", () => expect(formatPrice("inicial", 80)).toContain("A partir de"));
  it("slugify accents", () => expect(slugify("João Elétrica")).toBe("joao-eletrica"));
});
