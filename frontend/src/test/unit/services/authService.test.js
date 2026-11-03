import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../services/api", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn(async () => undefined) };
});

import { ApiError, api } from "../../../services/api";
import {
  fetchCurrentUser,
  forgotPassword,
  isUnverifiedError,
  resetPassword,
  resendVerificationCode,
  signIn,
  signOut,
  signUp,
  toAuthErrorMessage,
  verifyEmail,
} from "../../../services/authService";

function lastCall() {
  return api.mock.calls.at(-1);
}

function bodyOfLastCall() {
  return JSON.parse(lastCall()[1].body);
}

beforeEach(() => {
  api.mockClear();
});

describe("authService endpoints", () => {
  it("signUp normalises the email and sends the profile fields", async () => {
    await signUp({
      email: "  User@Example.COM ",
      password: "Secret#123",
      fullName: "  Ada Lovelace ",
      phoneNumber: "+923001234567",
    });

    expect(lastCall()[0]).toBe("/auth/signup");
    expect(lastCall()[1].method).toBe("POST");
    expect(bodyOfLastCall()).toEqual({
      email: "user@example.com",
      password: "Secret#123",
      full_name: "Ada Lovelace",
      phone_number: "+923001234567",
    });
  });

  it("signIn sends remember_me and returns the user payload", async () => {
    api.mockResolvedValueOnce({ user: { id: 1, email: "a@b.com" } });

    const user = await signIn({
      email: " A@B.com ",
      password: "Secret#123",
      remember: true,
    });

    expect(lastCall()[0]).toBe("/auth/login");
    expect(bodyOfLastCall()).toEqual({
      email: "a@b.com",
      password: "Secret#123",
      remember_me: true,
    });
    expect(user).toEqual({ id: 1, email: "a@b.com" });
  });

  it("fetchCurrentUser and signOut use the session endpoints", async () => {
    await fetchCurrentUser();
    expect(lastCall()[0]).toBe("/auth/me");
    expect(lastCall()[1]).toBeUndefined();

    await signOut();
    expect(lastCall()[0]).toBe("/auth/logout");
    expect(lastCall()[1]).toEqual({ method: "POST" });
  });

  it("email verification endpoints normalise the address", async () => {
    await verifyEmail({ email: " USER@Example.com ", code: "123456" });
    expect(lastCall()[0]).toBe("/auth/verify-email");
    expect(bodyOfLastCall()).toEqual({ email: "user@example.com", code: "123456" });

    await resendVerificationCode({ email: " USER@Example.com " });
    expect(lastCall()[0]).toBe("/auth/resend-code");
    expect(bodyOfLastCall()).toEqual({ email: "user@example.com" });
  });

  it("password recovery endpoints normalise the address", async () => {
    await forgotPassword({ email: " USER@Example.com " });
    expect(lastCall()[0]).toBe("/auth/forgot-password");
    expect(bodyOfLastCall()).toEqual({ email: "user@example.com" });

    await resetPassword({
      email: " USER@Example.com ",
      code: "654321",
      password: "NewSecret#123",
    });
    expect(lastCall()[0]).toBe("/auth/reset-password");
    expect(bodyOfLastCall()).toEqual({
      email: "user@example.com",
      code: "654321",
      password: "NewSecret#123",
    });
  });
});

describe("isUnverifiedError()", () => {
  it("is true only for a 403 ApiError", () => {
    expect(isUnverifiedError(new ApiError(403, "verify"))).toBe(true);
    expect(isUnverifiedError(new ApiError(401, "nope"))).toBe(false);
    expect(isUnverifiedError(new Error("403"))).toBe(false);
    expect(isUnverifiedError(undefined)).toBe(false);
  });
});

describe("toAuthErrorMessage()", () => {
  it("maps known auth statuses to friendly copy", () => {
    expect(toAuthErrorMessage(new ApiError(401, "bad"))).toBe(
      "Email or password is incorrect.",
    );
    expect(toAuthErrorMessage(new ApiError(403, "verify"))).toContain("hasn't been verified");
    expect(toAuthErrorMessage(new ApiError(429, "slow"))).toContain("Too many attempts");
    expect(toAuthErrorMessage(new ApiError(404, "missing"))).toContain("isn't available yet");
    expect(toAuthErrorMessage(new ApiError(405, "missing"))).toContain("isn't available yet");
  });

  it("prefers the server detail for other statuses", () => {
    expect(toAuthErrorMessage(new ApiError(422, "Email already registered"))).toBe(
      "Email already registered",
    );
  });

  it("explains network failures", () => {
    expect(toAuthErrorMessage(new TypeError("Failed to fetch"))).toContain(
      "couldn't reach the server",
    );
  });

  it("falls back to the provided message for unknown errors", () => {
    expect(toAuthErrorMessage(new Error("boom"), "Try again")).toBe("boom");
    expect(toAuthErrorMessage("weird", "Try again")).toBe("Try again");
  });
});
