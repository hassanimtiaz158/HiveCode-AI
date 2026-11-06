import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "../../../components/site/SiteFooter";

function renderFooter() {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <SiteFooter />
    </MemoryRouter>,
  );
}

describe("SiteFooter", () => {
  it("renders the copyright and public links", () => {
    renderFooter();

    expect(screen.getByText(new RegExp(`${new Date().getFullYear()} HiveCode AI`))).toBeTruthy();

    const footerNav = within(screen.getByRole("navigation", { name: /footer/i }));
    expect(footerNav.getByRole("link", { name: /^about$/i }).getAttribute("href")).toBe("/about");
    expect(footerNav.getByRole("link", { name: /^privacy$/i }).getAttribute("href")).toBe(
      "/privacy",
    );
    expect(footerNav.getByRole("link", { name: /^pricing$/i }).getAttribute("href")).toBe(
      "/pricing",
    );
  });
});
