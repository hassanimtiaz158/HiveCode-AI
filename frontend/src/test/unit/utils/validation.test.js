import { describe, expect, it } from "vitest";
import {
  getPasswordStrength,
  toE164,
  validateCheckbox,
  validateConfirmPassword,
  validateEmail,
  validateOtp,
  validatePassword,
  validatePhone,
  validateRequiredName,
} from "../../../utils/validation";

describe("validateEmail", () => {
  it("requires a value", () => {
    expect(validateEmail("")).toBe("Email is required.");
    expect(validateEmail("   ")).toBe("Email is required.");
  });

  it("rejects malformed addresses", () => {
    ["plain", "a@b", "a@b.c", "a b@c.com", "a@@b.com"].forEach((value) => {
      expect(validateEmail(value)).toMatch(/valid email/i);
    });
  });

  it("accepts a valid address with surrounding whitespace", () => {
    expect(validateEmail(" you@company.com ")).toBeUndefined();
  });
});

describe("validateRequiredName", () => {
  it("requires a trimmed name of at least two characters", () => {
    expect(validateRequiredName("")).toMatch(/required/i);
    expect(validateRequiredName(" A ")).toMatch(/at least 2/i);
  });

  it("accepts reasonable names and rejects very long ones", () => {
    expect(validateRequiredName("Alex Rivera")).toBeUndefined();
    expect(validateRequiredName("a".repeat(80))).toBeUndefined();
    expect(validateRequiredName("a".repeat(81))).toMatch(/80 characters or fewer/i);
  });
});

describe("validatePassword", () => {
  it("requires a value", () => {
    expect(validatePassword("")).toBe("Password is required.");
  });

  it("enforces the 10-128 character range", () => {
    expect(validatePassword("a".repeat(9))).toMatch(/at least 10/i);
    expect(validatePassword("a".repeat(10))).toBeUndefined();
    expect(validatePassword("a".repeat(128))).toBeUndefined();
    expect(validatePassword("a".repeat(129))).toMatch(/128 characters or fewer/i);
  });
});

describe("validateConfirmPassword", () => {
  it("requires confirmation and an exact match", () => {
    expect(validateConfirmPassword("secret", "")).toMatch(/confirm/i);
    expect(validateConfirmPassword("secret", "Secret")).toMatch(/do not match/i);
    expect(validateConfirmPassword("secret", "secret")).toBeUndefined();
  });
});

describe("validateCheckbox", () => {
  it("requires acceptance", () => {
    expect(validateCheckbox(false)).toMatch(/accept the terms/i);
    expect(validateCheckbox(true)).toBeUndefined();
  });
});

describe("validateOtp", () => {
  it("requires exactly six digits", () => {
    expect(validateOtp("")).toMatch(/enter the 6-digit code/i);
    expect(validateOtp("12a456")).toMatch(/only digits/i);
    expect(validateOtp("12345")).toMatch(/full 6-digit/i);
    expect(validateOtp(" 123456 ")).toBeUndefined();
  });
});

describe("validatePhone", () => {
  it("requires 6-15 digits, ignoring formatting characters", () => {
    expect(validatePhone("")).toMatch(/required/i);
    expect(validatePhone("abc123")).toMatch(/only contain digits/i);
    expect(validatePhone("12345")).toMatch(/6-15 digits/i);
    expect(validatePhone("(300) 123-4567")).toBeUndefined();
    expect(validatePhone("1".repeat(15))).toBeUndefined();
    expect(validatePhone("1".repeat(16))).toMatch(/6-15 digits/i);
  });
});

describe("toE164", () => {
  it("joins the dial code and digits without formatting", () => {
    expect(toE164("+92", "300 1234567")).toBe("+923001234567");
    expect(toE164("+1", "(555) 123-4567")).toBe("+15551234567");
  });
});

describe("getPasswordStrength", () => {
  it("returns a zero score for an empty password", () => {
    expect(getPasswordStrength("")).toMatchObject({ score: 0, label: "Too weak" });
  });

  it("caps repeated-only passwords at weak", () => {
    expect(getPasswordStrength("aaaaaaaaaaaa")).toMatchObject({ score: 1, label: "Weak" });
  });

  it("scores length and character variety", () => {
    expect(getPasswordStrength("short")).toMatchObject({ score: 0, label: "Too weak" });
    expect(getPasswordStrength("Abcdefgh12!@")).toMatchObject({ score: 3, label: "Strong" });
    expect(getPasswordStrength("CorrectHorseBatteryStaple1!")).toMatchObject({
      score: 4,
      label: "Very strong",
    });
  });
});
