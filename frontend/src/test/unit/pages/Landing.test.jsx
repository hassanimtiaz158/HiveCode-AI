import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("../../../components/landing/VoiceIntakeCard", () => ({
  VoiceIntakeCard: ({ onConfirm }) => (
    <button onClick={onConfirm} type="button">
      Confirm mock brief
    </button>
  ),
}));

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
  mocks.navigate.mockReset();
  useAuth.setState({ user: null, status: "idle", pendingEmail: null });
});

describe("Landing page", () => {
  it("shows guest navigation and the marketing sections", () => {
    renderLanding();

    expect(screen.getByRole("link", { name: /^sign in$/i }).getAttribute("href")).toBe("/login");
    expect(screen.getByRole("link", { name: /get started/i }).getAttribute("href")).toBe("/signup");
    expect(screen.queryByRole("link", { name: /open dashboard/i })).toBeNull();
    expect(screen.getByRole("heading", { name: /how it works/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /try a brief like/i })).toBeTruthy();
    expect(screen.getByText(/speak in urdu, english, or roman urdu/i)).toBeTruthy();
    expect(screen.getByText("Leather shop")).toBeTruthy();
  });

  it("shows the dashboard link to a signed-in visitor", () => {
    useAuth.setState({ user: { id: 1, full_name: "Ada" }, status: "authenticated" });
    renderLanding();

    expect(screen.getByRole("link", { name: /open dashboard/i }).getAttribute("href")).toBe(
      "/dashboard",
    );
    expect(screen.queryByRole("link", { name: /get started/i })).toBeNull();
  });

  it("sends a guest to sign in after confirming a brief", () => {
    renderLanding();

    fireEvent.click(screen.getByRole("button", { name: /confirm mock brief/i }));

    expect(mocks.navigate).toHaveBeenCalledWith("/login", {
      replace: true,
      state: { from: "/dashboard" },
    });
  });

  it("sends a signed-in visitor straight to the dashboard", () => {
    useAuth.setState({ user: { id: 1 }, status: "authenticated" });
    renderLanding();

    fireEvent.click(screen.getByRole("button", { name: /confirm mock brief/i }));

    expect(mocks.navigate).toHaveBeenCalledWith("/dashboard", {
      replace: true,
      state: undefined,
    });
  });
});
