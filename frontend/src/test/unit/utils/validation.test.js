import { describe, expect, it } from "vitest";
import {
  NAME_MAX,
  NAME_MIN,
  OTP_LENGTH,
  OTP_TTL_SECONDS,
  PASSWORD_MAX,
  PASSWORD_MIN,
  PHONE_NATIONAL_MAX,
  PHONE_NATIONAL_MIN,
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

describe("validation constants", () => {
  it("exposes the limits shared by the forms", () => {
    expect({
      PASSWORD_MIN,
      PASSWORD_MAX,
      NAME_MIN,
      NAME_MAX,
      PHONE_NATIONAL_MIN,
      PHONE_NATIONAL_MAX,
      OTP_LENGTH,
      OTP_TTL_SECONDS,
    }).toEqual({
      PASSWORD_MIN: 10,
      PASSWORD_MAX: 128,
      NAME_MIN: 2,
      NAME_MAX: 80,
      PHONE_NATIONAL_MIN: 6,
      PHONE_NATIONAL_MAX: 15,
      OTP_LENGTH: 6,
      OTP_TTL_SECONDS: 60,
    });
  });
});

describe("validateEmail", () => {
  it("requires a non-blank value", () => {
    expect(validateEmail("")).toBe("Email is required.");
    expect(validateEmail("   ")).toBe("Email is required.");
    expect(validateEmail("\t\n")).toBe("Email is required.");
  });

  it("accepts common valid formats, including surrounding whitespace", () => {
    [
      "you@company.com",
      " YOU@COMPANY.COM ",
      "first.last+tag@sub.example.co",
      "a_b-c@my-domain.io",
      "x@y.io",
      "\tada@example.com\n",
    ].forEach((value) => {
      expect(validateEmail(value)).toBeUndefined();
    });
  });

  it("rejects malformed addresses", () => {
    [
      "plain",
      "a@b",
      "a@b.c",
      "a b@c.com",
      "a@@b.com",
      "@b.com",
      "a@.com",
      "a@ b.com",
      "a@b .com",
      "a@b\t.com",
    ].forEach((value) => {
      expect(validateEmail(value)).toMatch(/valid email/i);
    });
  });
});

describe("validateRequiredName", () => {
  it("requires a trimmed value", () => {
    expect(validateRequiredName("")).toBe("Full name is required.");
    expect(validateRequiredName("   ")).toBe("Full name is required.");
    expect(validateRequiredName("\t\n")).toBe("Full name is required.");
  });

  it("enforces the 2-80 character range after trimming", () => {
    expect(validateRequiredName(" A ")).toMatch(/at least 2/i);
    expect(validateRequiredName("Al")).toBeUndefined();
    expect(validateRequiredName("  Ada Lovelace  ")).toBeUndefined();
    expect(validateRequiredName("a".repeat(NAME_MAX))).toBeUndefined();
    expect(validateRequiredName(`  ${"a".repeat(NAME_MAX)}  `)).toBeUndefined();
    expect(validateRequiredName("a".repeat(NAME_MAX + 1))).toMatch(/80 characters or fewer/i);
  });
});

describe("validatePassword", () => {
  it("requires a value", () => {
    expect(validatePassword("")).toBe("Password is required.");
  });

  it("enforces the 10-128 character range at the boundaries", () => {
    expect(validatePassword("a".repeat(PASSWORD_MIN - 1))).toMatch(/at least 10/i);
    expect(validatePassword("a".repeat(PASSWORD_MIN))).toBeUndefined();
    expect(validatePassword("a".repeat(PASSWORD_MAX))).toBeUndefined();
    expect(validatePassword("a".repeat(PASSWORD_MAX + 1))).toMatch(/128 characters or fewer/i);
  });

  it("counts any characters, without requiring character variety", () => {
    expect(validatePassword("correct horse battery staple")).toBeUndefined();
    expect(validatePassword("!@#$%^&*()")).toBeUndefined();
  });
});

describe("validateConfirmPassword", () => {
  it("requires confirmation", () => {
    expect(validateConfirmPassword("", "")).toBe("Please confirm your password.");
    expect(validateConfirmPassword("secret", "")).toBe("Please confirm your password.");
  });

  it("requires an exact, case-sensitive match", () => {
    expect(validateConfirmPassword("secret", "Secret")).toBe("Passwords do not match.");
    expect(validateConfirmPassword("secret", "secret ")).toBe("Passwords do not match.");
    expect(validateConfirmPassword("", "x")).toBe("Passwords do not match.");
    expect(validateConfirmPassword("secret", "secret")).toBeUndefined();
  });
});

describe("validateCheckbox", () => {
  it("requires acceptance", () => {
    expect(validateCheckbox(false)).toBe("You must accept the terms to continue.");
    expect(validateCheckbox(true)).toBeUndefined();
  });
});

describe("validateOtp", () => {
  it("requires six digits", () => {
    expect(validateOtp("")).toMatch(/enter the 6-digit code/i);
    expect(validateOtp(undefined)).toMatch(/enter the 6-digit code/i);
    expect(validateOtp(null)).toMatch(/enter the 6-digit code/i);
    expect(validateOtp("   ")).toMatch(/enter the 6-digit code/i);
  });

  it("rejects non-digit characters", () => {
    ["12a456", "12!456", "12 456", "12345.6", "١٢٣٤٥٦"].forEach((value) => {
      expect(validateOtp(value)).toBe("The code contains only digits.");
    });
  });

  it("rejects codes that are not exactly six digits", () => {
    expect(validateOtp("12345")).toMatch(/full 6-digit/i);
    expect(validateOtp("1234567")).toMatch(/full 6-digit/i);
  });

  it("accepts six digits with surrounding whitespace", () => {
    expect(validateOtp("123456")).toBeUndefined();
    expect(validateOtp(" 123456 ")).toBeUndefined();
    expect(validateOtp("\t123456\n")).toBeUndefined();
  });
});

describe("validatePhone", () => {
  it("requires at least one digit after removing formatting", () => {
    expect(validatePhone("")).toMatch(/required/i);
    expect(validatePhone(undefined)).toMatch(/required/i);
    expect(validatePhone(null)).toMatch(/required/i);
    expect(validatePhone("   ")).toMatch(/required/i);
    expect(validatePhone("() -")).toMatch(/required/i);
  });

  it("rejects non-digit input, including a country-code prefix", () => {
    expect(validatePhone("abc123")).toMatch(/only contain digits/i);
    expect(validatePhone("+923001234567")).toMatch(/only contain digits/i);
    expect(validatePhone("300.123.4567")).toMatch(/only contain digits/i);
  });

  it("enforces the 6-15 digit range at the boundaries", () => {
    expect(validatePhone("1".repeat(PHONE_NATIONAL_MIN - 1))).toMatch(/6-15 digits/i);
    expect(validatePhone("1".repeat(PHONE_NATIONAL_MIN))).toBeUndefined();
    expect(validatePhone("1".repeat(PHONE_NATIONAL_MAX))).toBeUndefined();
    expect(validatePhone("1".repeat(PHONE_NATIONAL_MAX + 1))).toMatch(/6-15 digits/i);
  });

  it("ignores spaces, parentheses and hyphens", () => {
    expect(validatePhone("(300) 123-4567")).toBeUndefined();
    expect(validatePhone("300 123 4567")).toBeUndefined();
    expect(validatePhone("0300-1234567")).toBeUndefined();
  });
});

describe("toE164", () => {
  it("joins the dial code and national digits without formatting", () => {
    expect(toE164("+92", "300 1234567")).toBe("+923001234567");
    expect(toE164("+1", "(555) 123-4567")).toBe("+15551234567");
    expect(toE164("+971", "50-123-4567")).toBe("+971501234567");
  });

  it("does not validate or pad the parts", () => {
    expect(toE164("+44", "")).toBe("+44");
    expect(toE164("+1", "   ")).toBe("+1");
    expect(toE164("+92", "3001234567")).toBe("+923001234567");
  });
});

describe("getPasswordStrength", () => {
  it("returns the zero state for an empty password", () => {
    expect(getPasswordStrength("")).toEqual({
      score: 0,
      label: "Too weak",
      bars: "bg-rose-500",
      text: "text-rose-300",
    });
  });

  it("maps each score to its label and styling", () => {
    [
      {
        password: "short",
        score: 0,
        label: "Too weak",
        bars: "bg-rose-500",
        text: "text-rose-300",
      },
      {
        password: "abcdefghij",
        score: 1,
        label: "Weak",
        bars: "bg-rose-400",
        text: "text-rose-300",
      },
      {
        password: "abcdefghij1",
        score: 2,
        label: "Fair",
        bars: "bg-amber-400",
        text: "text-amber-200",
      },
      {
        password: "Abcdefghij1!",
        score: 3,
        label: "Strong",
        bars: "bg-emerald-400",
        text: "text-emerald-200",
      },
      {
        password: "Abcdefghij123!",
        score: 4,
        label: "Very strong",
        bars: "bg-emerald-300",
        text: "text-emerald-100",
      },
    ].forEach(({ password, ...expected }) => {
      expect(getPasswordStrength(password)).toEqual(expected);
    });
  });

  it("rewards length and variety independently", () => {
    expect(getPasswordStrength("abcdefghij").score).toBe(1);
    expect(getPasswordStrength("abcdefghij1").score).toBe(2);
    expect(getPasswordStrength("ABCDEFGHIJ1").score).toBe(2);
    expect(getPasswordStrength("!!!!!!!!!!").score).toBe(1);
    expect(getPasswordStrength("Abcdefghij1!").score).toBe(3);
    expect(getPasswordStrength("Abcdefghij123!").score).toBe(4);
  });

  it("caps passwords built from at most two distinct characters", () => {
    expect(getPasswordStrength("aaaaaaaaaaaaaa")).toMatchObject({
      score: 1,
      label: "Weak",
    });
    expect(getPasswordStrength("a1a1a1a1a1a1")).toMatchObject({
      score: 1,
      label: "Weak",
    });
    expect(getPasswordStrength("abababababab")).toMatchObject({
      score: 1,
      label: "Weak",
    });
  });

  it("does not cap passwords with more than two distinct characters", () => {
    expect(getPasswordStrength("abcabcabc1!")).toMatchObject({
      score: 2,
      label: "Fair",
    });
  });
});
