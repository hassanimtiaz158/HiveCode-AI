import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { PublicLayout } from "../../../components/site/PublicLayout";
import { useAuth } from "../../../store/auth";

beforeEach(() => {
  useAuth.setState({ user: null, status: "idle", pendingEmail: null });
});

describe("PublicLayout", () => {
  it("wraps content with the shared header and footer", () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <PublicLayout>
          <h1>Page content</h1>
        </PublicLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation", { name: /primary/i })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: /footer/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /page content/i })).toBeTruthy();
    expect(screen.getByRole("main")).toBeTruthy();
  });
});
