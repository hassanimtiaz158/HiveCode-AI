import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { RequireAuth } from "../../../components/RequireAuth";
import { useAuth } from "../../../store/auth";

function renderGuard() {
  return render(
    <MemoryRouter
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      initialEntries={["/dashboard"]}
    >
      <Routes>
        <Route element={<h1>Sign in screen</h1>} path="/login" />
        <Route
          element={
            <RequireAuth>
              <h1>Protected dashboard</h1>
            </RequireAuth>
          }
          path="/dashboard"
        />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuth.setState({ user: null, status: "anonymous", pendingEmail: null });
});

describe("RequireAuth", () => {
  it("waits while the session is still loading", () => {
    useAuth.setState({ status: "loading" });
    renderGuard();

    expect(screen.getByRole("status").textContent).toMatch(/checking your session/i);
    expect(screen.queryByText("Protected dashboard")).toBeNull();
  });

  it("waits while the session has not been probed yet", () => {
    useAuth.setState({ status: "idle" });
    renderGuard();

    expect(screen.getByRole("status").textContent).toMatch(/checking your session/i);
  });

  it("redirects an anonymous visitor to sign in", () => {
    renderGuard();

    expect(screen.getByRole("heading", { name: "Sign in screen" })).toBeTruthy();
    expect(screen.queryByText("Protected dashboard")).toBeNull();
  });

  it("renders the protected page for an authenticated user", () => {
    useAuth.setState({
      user: { id: 1, email: "ada@example.com" },
      status: "authenticated",
    });
    renderGuard();

    expect(screen.getByRole("heading", { name: "Protected dashboard" })).toBeTruthy();
    expect(screen.queryByText("Sign in screen")).toBeNull();
  });
});
