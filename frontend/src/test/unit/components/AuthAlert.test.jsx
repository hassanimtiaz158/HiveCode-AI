import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthAlert } from "../../../components/AuthAlert";

describe("AuthAlert", () => {
  it("announces errors assertively", () => {
    render(<AuthAlert message="Microphone access was blocked." variant="error" />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Microphone access was blocked.");
    expect(alert.getAttribute("aria-live")).toBe("assertive");
    expect(alert.className).toContain("rose");
  });

  it("announces informational messages politely", () => {
    render(<AuthAlert message="A fresh code is on its way." />);

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("A fresh code is on its way.");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.className).toContain("brand-indigo");
  });

  it("uses success styling for the success variant", () => {
    render(<AuthAlert message="Saved." variant="success" />);

    expect(screen.getByRole("status").className).toContain("emerald");
  });
});
