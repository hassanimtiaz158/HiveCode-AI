import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../helpers/renderApp";

function primaryNav() {
  return within(screen.getByRole("navigation", { name: /primary/i }));
}

describe("app routing", () => {
  it("opens the landing page at the root", () => {
    renderApp({ route: "/" });

    expect(
      screen.getByRole("heading", { name: /speak your idea\. get a live website\./i }),
    ).toBeTruthy();
  });

  it("opens the landing page for unknown routes", () => {
    renderApp({ route: "/does-not-exist" });

    expect(
      screen.getByRole("heading", { name: /speak your idea\. get a live website\./i }),
    ).toBeTruthy();
  });

  it("shows the public navigation on the landing page", () => {
    renderApp({ route: "/" });

    expect(primaryNav().getByRole("link", { name: /^about$/i })).toBeTruthy();
    expect(primaryNav().getByRole("link", { name: /^privacy$/i })).toBeTruthy();
    expect(primaryNav().getByRole("link", { name: /^pricing$/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /^login$/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /^sign up$/i })).toBeTruthy();
  });

  it("moves between public pages through the header links", () => {
    renderApp({ route: "/" });

    fireEvent.click(primaryNav().getByRole("link", { name: /^about$/i }));
    expect(
      screen.getByRole("heading", { name: /built for people who would rather talk than type/i }),
    ).toBeTruthy();

    fireEvent.click(primaryNav().getByRole("link", { name: /^pricing$/i }));
    expect(screen.getByRole("heading", { name: /simple pricing\. start free\./i })).toBeTruthy();

    fireEvent.click(primaryNav().getByRole("link", { name: /^privacy$/i }));
    expect(
      screen.getByRole("heading", { name: /privacy, without the fine-print maze/i }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: /^sign up$/i }));
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: /sign in/i }));
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
  });

  it("shows dashboard navigation to a signed-in visitor", () => {
    renderApp({ route: "/", user: { id: 1, full_name: "Ada Lovelace" } });

    expect(screen.getByRole("link", { name: /open dashboard/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /^sign up$/i })).toBeNull();

    fireEvent.click(screen.getByRole("link", { name: /open dashboard/i }));
    expect(screen.getByRole("heading", { name: /welcome, ada lovelace/i })).toBeTruthy();
  });

  it("redirects a signed-out visitor from the dashboard to sign in", () => {
    renderApp({ route: "/dashboard" });

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
  });
});
