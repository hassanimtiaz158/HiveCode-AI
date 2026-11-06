import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/authService", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    signUp: vi.fn(),
  };
});

import { signUp } from "../../services/authService";
import { useAuth } from "../../store/auth";
import { renderApp } from "../helpers/renderApp";

const PASSWORD = "Str0ngPassphrase!";

function fillValidSignup(overrides = {}) {
  fireEvent.change(screen.getByLabelText(/full name/i), {
    target: { value: overrides.fullName ?? "  Ada Lovelace " },
  });
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: overrides.email ?? " Ada@Example.COM " },
  });
  fireEvent.change(screen.getByLabelText(/phone number/i), {
    target: { value: overrides.phone ?? "3001234567" },
  });
  fireEvent.change(screen.getByLabelText(/^password$/i), {
    target: { value: PASSWORD },
  });
  fireEvent.change(screen.getByLabelText(/confirm password/i), {
    target: { value: PASSWORD },
  });
  fireEvent.click(screen.getByLabelText(/i agree to the terms/i));
}

beforeEach(() => {
  signUp.mockReset();
});

describe("signup flow", () => {
  it("creates the account, stores the pending email and moves to verification", async () => {
    signUp.mockResolvedValueOnce(undefined);
    renderApp({ route: "/signup" });

    fillValidSignup();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await screen.findByRole("heading", { name: /check your inbox/i }, { timeout: 4000 });

    expect(signUp).toHaveBeenCalledTimes(1);
    expect(signUp.mock.calls[0][0]).toEqual({
      fullName: "  Ada Lovelace ",
      email: "ada@example.com",
      password: PASSWORD,
      phoneNumber: "+923001234567",
    });
    expect(useAuth.getState().pendingEmail).toBe("ada@example.com");
    expect(screen.getByText("ada@example.com")).toBeTruthy();
  });

  it("blocks submission and lists what needs fixing when the form is empty", () => {
    renderApp({ route: "/signup" });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      screen.getByText(/please check the highlighted fields before creating your account/i),
    ).toBeTruthy();
    expect(screen.getByText(/full name is required/i)).toBeTruthy();
    expect(screen.getByText(/email is required/i)).toBeTruthy();
    expect(screen.getByText(/password is required/i)).toBeTruthy();
    expect(screen.getByText(/you must accept the terms/i)).toBeTruthy();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("reports a server failure without leaving the signup page", async () => {
    signUp.mockRejectedValueOnce(new Error("network down"));
    renderApp({ route: "/signup" });

    fillValidSignup();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await screen.findByText("network down");
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeTruthy();
    expect(useAuth.getState().pendingEmail).toBeNull();
  });

  it("links to sign in for people who already have an account", () => {
    renderApp({ route: "/signup" });

    fireEvent.click(screen.getByRole("link", { name: /sign in/i }));

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
  });

  it("fills both password fields from the suggest button", () => {
    renderApp({ route: "/signup" });

    fireEvent.click(screen.getByRole("button", { name: /suggest a strong password/i }));

    const password = screen.getByLabelText(/^password$/i).value;
    expect(password.length).toBe(16);
    expect(screen.getByLabelText(/confirm password/i).value).toBe(password);
    expect(screen.getByText(/very strong/i)).toBeTruthy();
  });
});
