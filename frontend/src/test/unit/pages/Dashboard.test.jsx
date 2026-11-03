import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Dashboard } from "../../../pages/Dashboard";
import { useAuth } from "../../../store/auth";

beforeEach(() => {
  useAuth.setState({ user: null, status: "idle", pendingEmail: null });
});

describe("Dashboard page", () => {
  it("greets the signed-in user by full name", () => {
    useAuth.setState({
      user: { id: 1, full_name: "Ada Lovelace", email: "ada@example.com" },
      status: "authenticated",
    });

    render(<Dashboard />);

    expect(screen.getByRole("heading", { name: "Welcome, Ada Lovelace" })).toBeTruthy();
    expect(screen.getByText(/this confirms the session/i)).toBeTruthy();
  });

  it("falls back to the email when no full name is stored", () => {
    useAuth.setState({
      user: { id: 1, email: "ada@example.com" },
      status: "authenticated",
    });

    render(<Dashboard />);

    expect(screen.getByRole("heading", { name: "Welcome, ada@example.com" })).toBeTruthy();
  });

  it("explains the signed-out state", () => {
    render(<Dashboard />);

    expect(screen.getByRole("heading", { name: /not signed in/i })).toBeTruthy();
    expect(screen.getByText(/head to \/login or \/signup/i)).toBeTruthy();
  });
});
