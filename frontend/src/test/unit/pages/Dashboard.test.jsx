import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVoiceRecorder } from "../../../hooks/useVoiceRecorder";
import { Dashboard } from "../../../pages/Dashboard";
import { useAuth } from "../../../store/auth";

vi.mock("../../../hooks/useVoiceRecorder", () => ({ useVoiceRecorder: vi.fn() }));

function idleRecorder(overrides = {}) {
  return {
    status: "idle",
    error: null,
    seconds: 0,
    clip: null,
    level: 0,
    heardSound: false,
    devices: [],
    selectedDeviceId: "",
    selectDevice: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Dashboard />
    </MemoryRouter>
  );
}

function signIn(user) {
  useAuth.setState({ user, status: "authenticated", pendingEmail: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  useVoiceRecorder.mockReturnValue(idleRecorder());
  useAuth.setState({ user: null, status: "anonymous", pendingEmail: null });
});

describe("Dashboard page", () => {
  it("greets the signed-in user and shows the intake card", () => {
    signIn({ id: 1, full_name: "Ada Lovelace", email: "ada@example.com" });
    renderDashboard();

    expect(screen.getByRole("heading", { name: "Welcome, Ada Lovelace" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /tell us what to build/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /start voice recording/i })).toBeTruthy();
    expect(screen.getByText(/signed in as ada@example.com/i)).toBeTruthy();
  });

  it("falls back to the email when no full name is stored", () => {
    signIn({ id: 1, email: "ada@example.com" });
    renderDashboard();

    expect(screen.getByRole("heading", { name: "Welcome, ada@example.com" })).toBeTruthy();
  });

  it("starts recording through the shared intake card", () => {
    const recorder = idleRecorder();
    useVoiceRecorder.mockReturnValue(recorder);
    signIn({ id: 1, email: "ada@example.com" });
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: /start voice recording/i }));

    expect(recorder.start).toHaveBeenCalledTimes(1);
  });

  it("captures a typed brief and offers a fresh start", () => {
    signIn({ id: 1, email: "ada@example.com" });
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: /type instead/i }));
    fireEvent.change(screen.getByLabelText("Type your brief"), {
      target: { value: "A bakery site with a menu." },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm & continue/i }));

    expect(screen.getByRole("heading", { name: /your brief is ready/i })).toBeTruthy();
    expect(screen.getByText("A bakery site with a menu.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /tell us what to build/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /start a new brief/i }));

    expect(screen.getByRole("heading", { name: /tell us what to build/i })).toBeTruthy();
    expect(screen.queryByText("A bakery site with a menu.")).toBeNull();
  });
});
