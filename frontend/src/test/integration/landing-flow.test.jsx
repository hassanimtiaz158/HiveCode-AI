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

  it("links to every landing section from the in-page navigation", () => {
    renderApp({ route: "/" });

    const sections = [
      ["How it works", "#how"],
      ["Pipeline", "#pipeline"],
      ["Use cases", "#use-cases"],
      ["Tunnel", "#tunnel"],
      ["Awareness", "#awareness"],
      ["Guidelines", "#guidelines"],
      ["FAQ", "#faq"],
      ["Contact", "#contact"],
    ];

    for (const [label, href] of sections) {
      const link = screen.getByRole("link", { name: new RegExp(`^${label}$`, "i") });
      expect(link.getAttribute("href")).toBe(href);
      expect(document.querySelector(href)).toBeTruthy();
    }
  });

  it("renders the pipeline, use cases, tunnel, awareness, guidelines, FAQ, and contact content", () => {
    renderApp({ route: "/" });

    expect(
      screen.getByRole("heading", { name: /a clear pipeline from brief to build/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /built for the website you need next/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /from a spoken idea to a live url/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /automation with human guardrails/i }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: /a better brief, in one take/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /questions, answered/i })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /tell us what you want to build/i }),
    ).toBeTruthy();

    expect(screen.getByText(/do i need to know how to code/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "hello@hivecode.ai" }).getAttribute("href")).toBe(
      "mailto:hello@hivecode.ai",
    );
    expect(screen.getByRole("link", { name: "support@hivecode.ai" }).getAttribute("href")).toBe(
      "mailto:support@hivecode.ai",
    );
  });
});
