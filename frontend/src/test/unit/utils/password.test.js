import { describe, expect, it, vi } from "vitest";
import { generateStrongPassword } from "../../../utils/password";

const ALLOWED = /^[a-km-zA-HJ-NP-Z2-9!@#$%^&*()_=+[\]{}-]+$/;
const AMBIGUOUS = /[0O1lI]/;

function expectEveryClass(password) {
  expect(password).toMatch(/[a-z]/);
  expect(password).toMatch(/[A-Z]/);
  expect(password).toMatch(/[2-9]/);
  expect(password).toMatch(/[!@#$%^&*()\-_=+[\]{}]/);
}

describe("generateStrongPassword", () => {
  it("generates a 16-character password with every character class", () => {
    const password = generateStrongPassword();

    expect(password).toHaveLength(16);
    expectEveryClass(password);
  });

  it("only emits characters from the allowed set", () => {
    for (let index = 0; index < 25; index += 1) {
      const password = generateStrongPassword();
      password.split("").forEach((character) => {
        expect(ALLOWED.test(character)).toBe(true);
      });
    }
  });

  it("excludes ambiguous look-alike characters", () => {
    for (let index = 0; index < 50; index += 1) {
      expect(generateStrongPassword(64)).not.toMatch(AMBIGUOUS);
      expect(generateStrongPassword()).not.toMatch(AMBIGUOUS);
    }
  });

  it("honours custom lengths", () => {
    [4, 8, 12, 32, 64].forEach((length) => {
      const password = generateStrongPassword(length);
      expect(password).toHaveLength(length);
      expectEveryClass(password);
    });
  });

  it("keeps one character from each class even below four characters", () => {
    expect(generateStrongPassword(0)).toHaveLength(4);
    expect(generateStrongPassword(1)).toHaveLength(4);
    expect(generateStrongPassword(3)).toHaveLength(4);
  });

  it("produces different values on successive calls", () => {
    const generated = new Set(
      Array.from({ length: 50 }, () => generateStrongPassword()),
    );

    expect(generated.size).toBe(50);
  });

  it("draws randomness from crypto.getRandomValues", () => {
    const getRandomValues = vi.fn((buffer) => {
      buffer.fill(0);
      return buffer;
    });
    vi.stubGlobal("crypto", { getRandomValues });

    const password = generateStrongPassword(16);

    // Four class picks, twelve fillers, fifteen shuffle swaps.
    expect(getRandomValues).toHaveBeenCalledTimes(31);
    getRandomValues.mock.calls.forEach(([buffer]) => {
      expect(buffer).toBeInstanceOf(Uint32Array);
      expect(buffer).toHaveLength(1);
    });
    expect(password).toHaveLength(16);
  });
});
