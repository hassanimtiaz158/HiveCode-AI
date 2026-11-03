import { describe, expect, it } from "vitest";
import { generateStrongPassword } from "../../../utils/password";

describe("generateStrongPassword", () => {
  it("generates a 16-character password with every character class", () => {
    const password = generateStrongPassword();

    expect(password).toHaveLength(16);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/\d/);
    expect(password).toMatch(/[!@#$%^&*()\-_=+[\]{}]/);
  });

  it("excludes ambiguous look-alike characters", () => {
    for (let index = 0; index < 25; index += 1) {
      expect(generateStrongPassword(64)).not.toMatch(/[0O1lI]/);
    }
  });

  it("honours a custom length that still fits every class", () => {
    expect(generateStrongPassword(4)).toHaveLength(4);
    expect(generateStrongPassword(8)).toHaveLength(8);
  });
});
