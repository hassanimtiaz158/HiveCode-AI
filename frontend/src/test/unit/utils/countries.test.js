import { describe, expect, it } from "vitest";
import { COUNTRIES } from "../../../utils/countries";

const FLAG = /^(?:[\uD83C][\uDDE6-\uDDFF]){2}$/;

describe("COUNTRIES", () => {
  it("contains the full supported country list", () => {
    expect(COUNTRIES).toHaveLength(61);
    expect(COUNTRIES.length).toBeGreaterThan(50);
  });

  it("has complete and unique metadata on every entry", () => {
    const isoCodes = new Set();
    const names = new Set();

    COUNTRIES.forEach((country) => {
      expect(Object.keys(country).sort()).toEqual(["dialCode", "flag", "iso2", "name"]);
      expect(country.name).toBe(country.name.trim());
      expect(country.name).not.toBe("");
      expect(country.iso2).toMatch(/^[A-Z]{2}$/);
      expect(country.dialCode).toMatch(/^\+\d{1,3}$/);
      expect(country.flag).toMatch(FLAG);

      expect(isoCodes.has(country.iso2)).toBe(false);
      isoCodes.add(country.iso2);

      expect(names.has(country.name)).toBe(false);
      names.add(country.name);
    });

    expect(isoCodes.size).toBe(COUNTRIES.length);
    expect(names.size).toBe(COUNTRIES.length);
  });

  it("puts Pakistan first so the default +92 dial code resolves", () => {
    expect(COUNTRIES[0]).toEqual({
      name: "Pakistan",
      iso2: "PK",
      dialCode: "+92",
      flag: "🇵🇰",
    });
  });

  it("includes the common countries used by the phone picker", () => {
    const byIso = new Map(COUNTRIES.map((country) => [country.iso2, country]));

    [
      ["US", "+1"],
      ["CA", "+1"],
      ["GB", "+44"],
      ["AE", "+971"],
      ["SA", "+966"],
      ["IN", "+91"],
      ["BD", "+880"],
      ["CN", "+86"],
      ["DE", "+49"],
      ["FR", "+33"],
      ["AU", "+61"],
      ["BR", "+55"],
      ["MX", "+52"],
      ["ZA", "+27"],
    ].forEach(([iso2, dialCode]) => {
      expect(byIso.get(iso2)?.dialCode).toBe(dialCode);
    });

    expect(byIso.get("United States")).toBeUndefined();
    expect(byIso.get("US")?.name).toBe("United States");
  });

  it("allows shared dial codes between countries", () => {
    expect(COUNTRIES.filter((country) => country.dialCode === "+1").map((c) => c.iso2)).toEqual([
      "US",
      "CA",
    ]);
  });
});
