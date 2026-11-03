import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../helpers/renderApp";

describe("app routing", () => {
  it("redirects unknown routes to sign in", () => {
    renderApp({ route: "/does-not-exist" });

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
  });

  it("shows guest navigation on the landing page", () => {
    renderApp({ route: "/" });

    expect(screen.getByRole("link", { name: /^sign in$/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /get started/i })).toBeTruthy();
  });

  it("moves between public pages through the header links", () => {
    renderApp({ route: "/" });

    fireEvent.click(screen.getByRole("link", { name: /get started/i }));
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: /sign in/i }));
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
  });

  it("shows dashboard navigation to a signed-in visitor", () => {
    renderApp({ route: "/", user: { id: 1, full_name: "Ada Lovelace" } });

    expect(screen.getByRole("link", { name: /open dashboard/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /get started/i })).toBeNull();

    fireEvent.click(screen.getByRole("link", { name: /open dashboard/i }));
    expect(screen.getByRole("heading", { name: /welcome, ada lovelace/i })).toBeTruthy();
  });

  it("tells a signed-out visitor that the dashboard needs a session", () => {
    renderApp({ route: "/dashboard" });

    expect(screen.getByRole("heading", { name: /not signed in/i })).toBeTruthy();
  });
});
