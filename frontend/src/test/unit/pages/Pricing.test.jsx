import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Pricing } from "../../../pages/Pricing";

function renderPricing() {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Pricing />
    </MemoryRouter>,
  );
}

describe("Pricing page", () => {
  it("shows the free starter plan and signup call to action", () => {
    renderPricing();

    expect(
      screen.getByRole("heading", { name: /simple pricing\. start free\./i }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: /starter/i })).toBeTruthy();
    expect(screen.getByText("$0")).toBeTruthy();
    expect(screen.getByText(/no credit card required/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /create your free account/i }).getAttribute("href"),
    ).toBe("/signup");
  });
});
