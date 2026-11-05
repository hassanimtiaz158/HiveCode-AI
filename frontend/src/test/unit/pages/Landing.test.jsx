import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { Landing } from "../../../pages/Landing";
import { useAuth } from "../../../store/auth";

function renderLanding() {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Landing />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuth.setState({ user: null, status: "idle", pendingEmail: null });
});

describe("Landing page", () => {
  it("shows the public navigation and hero calls to action", () => {
    renderLanding();

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
    expect(screen.queryByRole("link", { name: /open dashboard/i })).toBeNull();

    expect(
      screen.getByRole("heading", { name: /speak your idea\. get a live website\./i }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /start building free/i }).getAttribute("href")).toBe(
      "/signup",
    );
    expect(screen.getByRole("link", { name: /see how it works/i }).getAttribute("href")).toBe(
      "#how",
    );
    expect(screen.getByText(/a portfolio site for a photographer/i)).toBeTruthy();
  });

  it("does not render the voice intake recorder", () => {
    renderLanding();

    expect(screen.queryByRole("button", { name: /start voice recording/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /type instead/i })).toBeNull();
    expect(screen.queryByText(/tell us what to build/i)).toBeNull();
  });

  it("renders all five how-it-works steps", () => {
    renderLanding();

    expect(
      screen.getByRole("heading", { name: /from voice to website in five simple steps/i }),
    ).toBeTruthy();

    for (const title of [
      /speak your idea/i,
      /we transcribe it/i,
      /ai plans the site/i,
      /website is generated/i,
      /tweak and publish/i,
    ]) {
      expect(screen.getAllByRole("heading", { name: title }).length).toBeGreaterThan(0);
    }

    expect(screen.getByRole("heading", { name: /ready to build with your voice/i })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /create your free account/i }).getAttribute("href"),
    ).toBe("/signup");
  });

  it("shows dashboard links to a signed-in visitor", () => {
    useAuth.setState({ user: { id: 1, full_name: "Ada" }, status: "authenticated" });
    renderLanding();

    expect(screen.getByRole("link", { name: /open dashboard/i }).getAttribute("href")).toBe(
      "/dashboard",
    );
    expect(screen.queryByRole("link", { name: /^login$/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^sign up$/i })).toBeNull();
    expect(screen.getByRole("link", { name: /start building free/i }).getAttribute("href")).toBe(
      "/dashboard",
    );
    expect(
      screen.getByRole("link", { name: /go to your dashboard/i }).getAttribute("href"),
    ).toBe("/dashboard");
  });
});
