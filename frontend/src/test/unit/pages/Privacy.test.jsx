import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Privacy } from "../../../pages/Privacy";

function renderPrivacy() {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Privacy />
    </MemoryRouter>,
  );
}

describe("Privacy page", () => {
  it("explains how recordings, accounts, and sessions are handled", () => {
    renderPrivacy();

    expect(
      screen.getByRole("heading", { name: /privacy, without the fine-print maze/i }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: /your recordings/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /your account/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /your session/i })).toBeTruthy();
    expect(screen.getByText(/audio stays in your browser/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /what we do not do/i })).toBeTruthy();
  });
});
