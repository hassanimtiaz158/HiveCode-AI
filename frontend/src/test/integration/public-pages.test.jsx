import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../helpers/renderApp";

describe("public info pages", () => {
  it.each([
    ["/about", /built for people who would rather talk than type/i],
    ["/privacy", /privacy, without the fine-print maze/i],
    ["/pricing", /simple pricing\. start free\./i],
  ])("renders %s directly", (route, heading) => {
    renderApp({ route });

    expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
  });

  it("navigates from the landing footer to a public page", () => {
    renderApp({ route: "/" });

    const footerNav = within(screen.getByRole("navigation", { name: /footer/i }));
    fireEvent.click(footerNav.getByRole("link", { name: /^privacy$/i }));

    expect(
      screen.getByRole("heading", { name: /privacy, without the fine-print maze/i }),
    ).toBeTruthy();
  });
});
