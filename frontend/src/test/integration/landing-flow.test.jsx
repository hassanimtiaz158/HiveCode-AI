import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../helpers/renderApp";

describe("landing conversion flow", () => {
  it("sends a signed-out visitor to sign up from the primary call to action", () => {
    renderApp({ route: "/" });

    fireEvent.click(screen.getByRole("link", { name: /start building free/i }));

    expect(screen.getByRole("heading", { name: /create your account/i })).toBeTruthy();
  });

  it("sends a signed-in visitor to the dashboard from the primary call to action", () => {
    renderApp({ route: "/", user: { id: 1, full_name: "Ada Lovelace" } });

    fireEvent.click(screen.getByRole("link", { name: /start building free/i }));

    expect(screen.getByRole("heading", { name: /welcome, ada lovelace/i })).toBeTruthy();
  });

  it("links to the how-it-works section without a recorder on the page", () => {
    renderApp({ route: "/" });

    expect(screen.getByRole("link", { name: /see how it works/i }).getAttribute("href")).toBe(
      "#how",
    );
    expect(document.querySelector("#how")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /start voice recording/i })).toBeNull();
  });

  it("offers a signup call to action at the bottom of the page", () => {
    renderApp({ route: "/" });

    fireEvent.click(screen.getByRole("link", { name: /create your free account/i }));

    expect(screen.getByRole("heading", { name: /create your account/i })).toBeTruthy();
  });
});
