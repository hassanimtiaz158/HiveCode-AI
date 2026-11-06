import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { About } from "../../../pages/About";

function renderAbout() {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <About />
    </MemoryRouter>,
  );
}

describe("About page", () => {
  it("explains the product and links to signup", () => {
    renderAbout();

    expect(
      screen.getByRole("heading", { name: /built for people who would rather talk than type/i }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: /voice first/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /verified before shipped/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /nothing gets lost/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /start building free/i }).getAttribute("href")).toBe(
      "/signup",
    );
  });
});
