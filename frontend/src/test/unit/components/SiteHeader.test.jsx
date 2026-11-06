import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { SiteHeader } from "../../../components/site/SiteHeader";
import { useAuth } from "../../../store/auth";

function renderHeader() {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <SiteHeader />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuth.setState({ user: null, status: "idle", pendingEmail: null });
});

describe("SiteHeader", () => {
  it("renders the public links and guest actions", () => {
    renderHeader();

    const primaryNav = within(screen.getByRole("navigation", { name: /primary/i }));
    expect(primaryNav.getByRole("link", { name: /^about$/i }).getAttribute("href")).toBe("/about");
    expect(primaryNav.getByRole("link", { name: /^privacy$/i }).getAttribute("href")).toBe(
      "/privacy",
    );
    expect(primaryNav.getByRole("link", { name: /^pricing$/i }).getAttribute("href")).toBe(
      "/pricing",
    );

    expect(screen.getByRole("link", { name: /^login$/i }).getAttribute("href")).toBe("/login");
    expect(screen.getByRole("link", { name: /^sign up$/i }).getAttribute("href")).toBe("/signup");
    expect(screen.getByRole("link", { name: /hivecode ai home/i }).getAttribute("href")).toBe(
      "/",
    );
  });

  it("swaps guest actions for the dashboard when signed in", () => {
    useAuth.setState({ user: { id: 1, full_name: "Ada" }, status: "authenticated" });
    renderHeader();

    expect(screen.getByRole("link", { name: /open dashboard/i }).getAttribute("href")).toBe(
      "/dashboard",
    );
    expect(screen.queryByRole("link", { name: /^login$/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^sign up$/i })).toBeNull();
  });

  it("opens the mobile menu with public and auth links", () => {
    renderHeader();

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    const mobileNav = screen.getByRole("navigation", { name: /mobile/i });
    expect(within(mobileNav).getByRole("link", { name: /^about$/i }).getAttribute("href")).toBe(
      "/about",
    );
    expect(within(mobileNav).getByRole("link", { name: /^privacy$/i })).toBeTruthy();
    expect(within(mobileNav).getByRole("link", { name: /^pricing$/i })).toBeTruthy();
    expect(within(mobileNav).getByRole("link", { name: /^login$/i }).getAttribute("href")).toBe(
      "/login",
    );
    expect(within(mobileNav).getByRole("link", { name: /^sign up$/i }).getAttribute("href")).toBe(
      "/signup",
    );

    const toggle = screen.getByRole("button", { name: /close menu/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("closes the mobile menu on Escape", () => {
    renderHeader();

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByRole("navigation", { name: /mobile/i })).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("navigation", { name: /mobile/i })).toBeNull();
    expect(screen.getByRole("button", { name: /open menu/i }).getAttribute("aria-expanded")).toBe(
      "false",
    );
  });

  it("shows the dashboard link inside the mobile menu for signed-in visitors", () => {
    useAuth.setState({ user: { id: 1, full_name: "Ada" }, status: "authenticated" });
    renderHeader();

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    const mobileNav = screen.getByRole("navigation", { name: /mobile/i });
    expect(within(mobileNav).getByRole("link", { name: /open dashboard/i })).toBeTruthy();
    expect(within(mobileNav).queryByRole("link", { name: /^login$/i })).toBeNull();
  });
});
