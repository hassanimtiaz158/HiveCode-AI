import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/authService", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    resendVerificationCode: vi.fn(),
    verifyEmail: vi.fn(),
  };
});

import { resendVerificationCode, verifyEmail } from "../../services/authService";
import { renderApp } from "../helpers/renderApp";

const EMAIL = "ada@example.com";

function pasteCode(code) {
  fireEvent.paste(screen.getByLabelText("Digit 1 of 6"), {
    clipboardData: { getData: () => code },
  });
}

beforeEach(() => {
  verifyEmail.mockReset();
  resendVerificationCode.mockReset();
});

describe("email verification flow", () => {
  it("redirects to signup when there is no pending email", () => {
    renderApp({ route: "/verify-email" });

    expect(screen.getByRole("heading", { name: /create your account/i })).toBeTruthy();
  });

  it("verifies automatically once all six digits are entered", async () => {
    verifyEmail.mockResolvedValueOnce(undefined);
    renderApp({ route: "/verify-email", pendingEmail: EMAIL });

    expect(screen.getByText(EMAIL)).toBeTruthy();
    pasteCode("123456");

    await screen.findByRole("heading", { name: /email verified/i }, { timeout: 4000 });

    expect(verifyEmail).toHaveBeenCalledTimes(1);
    expect(verifyEmail.mock.calls[0][0]).toEqual({ email: EMAIL, code: "123456" });
    expect(screen.getByText(new RegExp(`${EMAIL} is confirmed`))).toBeTruthy();
  });

  it("continues to sign in from the success screen", async () => {
    verifyEmail.mockResolvedValueOnce(undefined);
    renderApp({ route: "/verify-email", pendingEmail: EMAIL });

    pasteCode("123456");
    await screen.findByRole("heading", { name: /email verified/i }, { timeout: 4000 });
    fireEvent.click(screen.getByRole("button", { name: /continue to sign in/i }));

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
  });

  it("rejects an incomplete code without calling the API", () => {
    renderApp({ route: "/verify-email", pendingEmail: EMAIL });

    fireEvent.change(screen.getByLabelText("Digit 1 of 6"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verify email/i }));

    expect(screen.getByText(/enter the full 6-digit code/i)).toBeTruthy();
    expect(verifyEmail).not.toHaveBeenCalled();
  });

  it("shows the server error when the code is wrong", async () => {
    verifyEmail.mockRejectedValueOnce(new Error("That code is incorrect."));
    renderApp({ route: "/verify-email", pendingEmail: EMAIL });

    pasteCode("000000");

    expect(
      await screen.findByText("That code is incorrect.", undefined, { timeout: 4000 }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /email verified/i })).toBeNull();
  });

  it("resends the code and starts the cooldown", async () => {
    resendVerificationCode.mockResolvedValueOnce(undefined);
    renderApp({ route: "/verify-email", pendingEmail: EMAIL });

    fireEvent.click(screen.getByRole("button", { name: /^resend code$/i }));

    await screen.findByText(/a fresh 6-digit code is on its way/i, undefined, { timeout: 4000 });
    expect(resendVerificationCode).toHaveBeenCalledWith({ email: EMAIL });

    await waitFor(
      () =>
        expect(
          screen.getByRole("button", { name: /resend code in \d+s/i }).disabled,
        ).toBe(true),
      { timeout: 4000 },
    );
  });
});
