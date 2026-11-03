import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/authService", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    signIn: vi.fn(),
  };
});

import { ApiError } from "../../services/api";
import { signIn } from "../../services/authService";
import { useAuth } from "../../store/auth";
import { renderApp } from "../helpers/renderApp";

const USER = { id: 5, email: "ada@example.com", full_name: "Ada Lovelace" };

function fillCredentials(email = "ada@example.com", password = "Str0ngPassphrase!") {
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/^password$/i), {
    target: { value: password },
  });
}

beforeEach(() => {
  signIn.mockReset();
});

describe("login flow", () => {
  it("signs in, stores the user and opens the dashboard", async () => {
    signIn.mockResolvedValueOnce(USER);
    renderApp({ route: "/login" });

    fillCredentials();
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await screen.findByRole("heading", { name: /welcome, ada lovelace/i }, { timeout: 4000 });

    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn.mock.calls[0][0]).toEqual({
      email: "ada@example.com",
      password: "Str0ngPassphrase!",
      remember: true,
    });
    expect(useAuth.getState().user).toEqual(USER);
    expect(useAuth.getState().status).toBe("authenticated");
  });

  it("routes an unverified account to the code screen", async () => {
    signIn.mockRejectedValueOnce(new ApiError(403, "Email not verified"));
    renderApp({ route: "/login" });

    fillCredentials("Ada@Example.com");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await screen.findByRole("heading", { name: /check your inbox/i }, { timeout: 4000 });

    expect(useAuth.getState().pendingEmail).toBe("ada@example.com");
    expect(useAuth.getState().user).toBeNull();
  });

  it("shows the generic message for bad credentials", async () => {
    signIn.mockRejectedValueOnce(new ApiError(401, "Invalid credentials"));
    renderApp({ route: "/login" });

    fillCredentials();
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText("Email or password is incorrect.", undefined, { timeout: 4000 }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
    expect(useAuth.getState().user).toBeNull();
  });

  it("validates the form before calling the API", () => {
    renderApp({ route: "/login" });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText(/email is required/i)).toBeTruthy();
    expect(screen.getByText(/password is required/i)).toBeTruthy();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("navigates to password recovery", () => {
    renderApp({ route: "/login" });

    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));

    expect(screen.getByRole("heading", { name: /forgot your password/i })).toBeTruthy();
  });

  it("returns to the originating route after a successful sign-in", async () => {
    signIn.mockResolvedValueOnce(USER);
    renderApp({
      route: { pathname: "/login", state: { from: "/dashboard" } },
    });

    fillCredentials();
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await screen.findByRole("heading", { name: /welcome, ada lovelace/i }, { timeout: 4000 });
  });
});
