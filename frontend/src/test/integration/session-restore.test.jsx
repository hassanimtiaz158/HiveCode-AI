import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/authService", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchCurrentUser: vi.fn() };
});

import { fetchCurrentUser } from "../../services/authService";
import { renderApp } from "../helpers/renderApp";

const USER = { id: 5, email: "ada@example.com", full_name: "Ada Lovelace" };

beforeEach(() => {
  fetchCurrentUser.mockReset();
});

describe("session restore", () => {
  it("restores an existing session before showing the dashboard", async () => {
    fetchCurrentUser.mockResolvedValueOnce(USER);
    renderApp({ route: "/dashboard", status: "idle" });

    expect(screen.getByRole("status").textContent).toMatch(/checking your session/i);

    await screen.findByRole("heading", { name: /welcome, ada lovelace/i }, { timeout: 4000 });

    expect(fetchCurrentUser).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: /tell us what to build/i })).toBeTruthy();
  });

  it("falls back to sign in when there is no session", async () => {
    fetchCurrentUser.mockRejectedValueOnce(new Error("unauthorized"));
    renderApp({ route: "/dashboard", status: "idle" });

    await screen.findByRole("heading", { name: /welcome back/i }, { timeout: 4000 });
  });
});
