import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../helpers/renderApp";

describe("dashboard page integration", () => {
  it("greets the restored session user and opens the intake", () => {
    renderApp({
      route: "/dashboard",
      user: { id: 5, email: "ada@example.com", full_name: "Ada Lovelace" },
    });

    expect(screen.getByRole("heading", { name: /welcome, ada lovelace/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /tell us what to build/i })).toBeTruthy();
  });

  it("falls back to the email when the profile has no name", () => {
    renderApp({
      route: "/dashboard",
      user: { id: 5, email: "ada@example.com" },
    });

    expect(screen.getByRole("heading", { name: /welcome, ada@example.com/i })).toBeTruthy();
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
