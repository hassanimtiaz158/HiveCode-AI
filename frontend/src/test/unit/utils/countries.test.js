import { describe, expect, it } from "vitest";
import { COUNTRIES } from "../../../utils/countries";

describe("COUNTRIES", () => {
  it("contains a substantial country list", () => {
    expect(COUNTRIES.length).toBeGreaterThan(50);
  });

  it("has complete and unique metadata", () => {
    const isoCodes = new Set();

    COUNTRIES.forEach((country) => {
      expect(country.name.trim()).not.toBe("");
      expect(country.iso2).toMatch(/^[A-Z]{2}$/);
      expect(country.dialCode).toMatch(/^\+\d+$/);
      expect(country.flag).not.toBe("");
      expect(isoCodes.has(country.iso2)).toBe(false);
      isoCodes.add(country.iso2);
    });
  });

  it("includes the default Pakistan entry and common dial codes", () => {
    expect(COUNTRIES.find((country) => country.iso2 === "PK")).toMatchObject({
      dialCode: "+92",
    });
    expect(COUNTRIES.some((country) => country.iso2 === "US" && country.dialCode === "+1")).toBe(
      true
    );
  });
});
