import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordStrength } from "../../../components/PasswordStrength";

describe("PasswordStrength", () => {
  it("shows guidance when the password is empty", () => {
    render(<PasswordStrength password="" />);

    expect(
      screen.getByText("Use at least 10 characters. Length matters more than symbols.")
    ).toBeTruthy();
    expect(screen.queryByText(/Password strength:/)).toBeNull();
  });

  it("rates a repeated password as weak", () => {
    render(<PasswordStrength password="aaaaaaaaaaaa" />);

    expect(screen.getByText("Password strength: Weak")).toBeTruthy();
  });

  it("rates a mixed password as strong", () => {
    render(<PasswordStrength password="Abcdefgh12!@" />);

    expect(screen.getByText("Password strength: Strong")).toBeTruthy();
  });

  it("rates a long mixed password as very strong", () => {
    render(<PasswordStrength password="CorrectHorseBatteryStaple1!" />);

    expect(screen.getByText("Password strength: Very strong")).toBeTruthy();
  });

  it("announces updates politely", () => {
    render(<PasswordStrength password="Abcdefgh12!@" />);

    expect(screen.getByText(/Password strength:/).getAttribute("aria-live")).toBe("polite");
  });
});
