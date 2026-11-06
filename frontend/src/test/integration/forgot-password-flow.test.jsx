import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/authService", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  };
});

import { forgotPassword, resetPassword } from "../../services/authService";
import { ApiError } from "../../services/api";
import { renderApp } from "../helpers/renderApp";

const EMAIL = "ada@example.com";
const PASSWORD = "NewStr0ngPassphrase!";

function requestCode() {
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: EMAIL },
  });
  fireEvent.click(screen.getByRole("button", { name: /send reset code/i }));
}

function pasteCode(code = "654321") {
  fireEvent.paste(screen.getByLabelText("Digit 1 of 6"), {
    clipboardData: { getData: () => code },
  });
}

function fillPassword(password = PASSWORD, confirm = PASSWORD) {
  fireEvent.change(screen.getByLabelText(/^new password$/i), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText(/confirm new password/i), {
    target: { value: confirm },
  });
}

function submitReset() {
  fireEvent.click(screen.getByRole("button", { name: /^reset password$/i }));
}

beforeEach(() => {
  forgotPassword.mockReset();
  resetPassword.mockReset();
});

describe("forgot password flow", () => {
  it("walks email and code plus password steps, then returns to sign in", async () => {
    forgotPassword.mockResolvedValue(undefined);
    resetPassword.mockResolvedValueOnce(undefined);
    renderApp({ route: "/forgot-password" });

    requestCode();
    await screen.findByRole("heading", { name: /enter the reset code/i }, { timeout: 4000 });
    expect(forgotPassword).toHaveBeenCalledWith({ email: EMAIL });
    expect(screen.getByRole("button", { name: /resend in 60s/i }).disabled).toBe(true);

    pasteCode();
    fillPassword();
    submitReset();

    await screen.findByRole("heading", { name: /password updated/i }, { timeout: 4000 });
    expect(resetPassword).toHaveBeenCalledWith({
      email: EMAIL,
      code: "654321",
      password: PASSWORD,
    });

    fireEvent.click(screen.getByRole("button", { name: /continue to sign in/i }));
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
  });

  it("validates the email before requesting a code", () => {
    renderApp({ route: "/forgot-password" });

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset code/i }));

    expect(screen.getByText(/enter a valid email address/i)).toBeTruthy();
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it("requires a complete code before resetting", async () => {
    forgotPassword.mockResolvedValue(undefined);
    renderApp({ route: "/forgot-password" });

    requestCode();
    await screen.findByRole("heading", { name: /enter the reset code/i }, { timeout: 4000 });

    fillPassword();
    submitReset();

    expect(screen.getByText(/enter the 6-digit code from your email/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /enter the reset code/i })).toBeTruthy();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("blocks mismatched passwords and keeps the reset form on screen", async () => {
    forgotPassword.mockResolvedValue(undefined);
    renderApp({ route: "/forgot-password" });

    requestCode();
    await screen.findByRole("heading", { name: /enter the reset code/i }, { timeout: 4000 });
    pasteCode();
    fillPassword(PASSWORD, "something-else");
    submitReset();

    expect(screen.getByText(/passwords do not match/i)).toBeTruthy();
    expect(resetPassword).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: /enter the reset code/i })).toBeTruthy();
  });

  it("shows an invalid code on the same page instead of moving on", async () => {
    forgotPassword.mockResolvedValue(undefined);
    resetPassword.mockRejectedValueOnce(new ApiError(400, "Invalid or expired reset code."));
    renderApp({ route: "/forgot-password" });

    requestCode();
    await screen.findByRole("heading", { name: /enter the reset code/i }, { timeout: 4000 });
    pasteCode("000000");
    fillPassword();
    submitReset();

    expect(
      await screen.findByText(/invalid code\. check the code and try again/i, undefined, {
        timeout: 4000,
      }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: /enter the reset code/i })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /choose a new password/i })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(resetPassword).toHaveBeenCalledWith({
      email: EMAIL,
      code: "000000",
      password: PASSWORD,
    });
  });

  it("lets the user go back to a different email", async () => {
    forgotPassword.mockResolvedValue(undefined);
    renderApp({ route: "/forgot-password" });

    requestCode();
    await screen.findByRole("heading", { name: /enter the reset code/i }, { timeout: 4000 });
    fireEvent.click(screen.getByRole("button", { name: /use a different email/i }));

    expect(screen.getByRole("heading", { name: /forgot your password/i })).toBeTruthy();
    expect(screen.getByLabelText(/email address/i).value).toBe(EMAIL);
  });
});
