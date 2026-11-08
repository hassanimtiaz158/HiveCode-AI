import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/authService", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, signOut: vi.fn() };
});

import { signOut } from "../../services/authService";
import { useAuth } from "../../store/auth";
import { renderApp } from "../helpers/renderApp";

beforeEach(() => {
  signOut.mockReset();
});

describe("dashboard page integration", () => {
  it("greets the restored session user and opens the intake", () => {
    renderApp({
      route: "/dashboard",
      user: { id: 5, email: "ada@example.com", full_name: "Ada Lovelace" },
    });

    expect(screen.getByRole("heading", { name: /welcome, ada lovelace/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /tell us what to build/i })).toBeTruthy();
  });

  it("uses a generic name when the profile has no name", () => {
    renderApp({
      route: "/dashboard",
      user: { id: 5, email: "ada@example.com" },
    });

    expect(screen.getByRole("heading", { name: /welcome, user/i })).toBeTruthy();
    expect(screen.queryByText(/ada@example.com/i)).toBeNull();
  });

  it("logs out and returns to the sign-in page", async () => {
    signOut.mockResolvedValueOnce(undefined);
    renderApp({
      route: "/dashboard",
      user: { id: 5, email: "ada@example.com", full_name: "Ada Lovelace" },
    });

    fireEvent.click(screen.getByRole("button", { name: /log out/i }));

    await screen.findByRole("heading", { name: /welcome back/i }, { timeout: 4000 });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("redirects a signed-out visitor to sign in", () => {
    renderApp({ route: "/dashboard" });

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /welcome,/i })).toBeNull();
  });

  it("captures a typed brief on the dashboard", () => {
    renderApp({
      route: "/dashboard",
      user: { id: 5, email: "ada@example.com", full_name: "Ada Lovelace" },
    });

    fireEvent.click(screen.getByRole("button", { name: /type instead/i }));
    fireEvent.change(screen.getByLabelText("Type your brief"), {
      target: { value: "A salon site with bookings." },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm & continue/i }));

    expect(screen.getByRole("heading", { name: /your brief is ready/i })).toBeTruthy();
    expect(screen.getByText("A salon site with bookings.")).toBeTruthy();
  });

  it("is reachable from the landing header when signed in", () => {
    renderApp({ route: "/landing", user: { id: 5, full_name: "Ada Lovelace" } });

    fireEvent.click(screen.getByRole("link", { name: /open dashboard/i }));

    expect(screen.getByRole("heading", { name: /welcome, ada lovelace/i })).toBeTruthy();
  });
});
