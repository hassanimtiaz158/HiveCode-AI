import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../helpers/renderApp";

describe("dashboard page integration", () => {
  it("greets the restored session user", () => {
    renderApp({
      route: "/dashboard",
      user: { id: 5, email: "ada@example.com", full_name: "Ada Lovelace" },
    });

    expect(screen.getByRole("heading", { name: /welcome, ada lovelace/i })).toBeTruthy();
    expect(screen.getByText(/this confirms the session/i)).toBeTruthy();
  });

  it("falls back to the email when the profile has no name", () => {
    renderApp({
      route: "/dashboard",
      user: { id: 5, email: "ada@example.com" },
    });

    expect(screen.getByRole("heading", { name: /welcome, ada@example.com/i })).toBeTruthy();
  });

  it("guides a signed-out visitor back to auth", () => {
    renderApp({ route: "/dashboard" });

    expect(screen.getByRole("heading", { name: /not signed in/i })).toBeTruthy();
    expect(screen.getByText(/head to \/login or \/signup/i)).toBeTruthy();
  });

  it("is reachable from the landing header when signed in", () => {
    renderApp({ route: "/", user: { id: 5, full_name: "Ada Lovelace" } });

    fireEvent.click(screen.getByRole("link", { name: /open dashboard/i }));

    expect(screen.getByRole("heading", { name: /welcome, ada lovelace/i })).toBeTruthy();
  });
});
