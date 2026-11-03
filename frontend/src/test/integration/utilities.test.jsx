import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/authService", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    signIn: vi.fn(),
    signUp: vi.fn(),
    verifyEmail: vi.fn(),
  };
});

import { signIn, signUp, verifyEmail } from "../../services/authService";
import { COUNTRIES } from "../../utils/countries";
import { renderApp } from "../helpers/renderApp";

const PASSWORD = "Str0ngPassphrase!";
const EMAIL = "ada@example.com";

function field(label) {
  return screen.getByLabelText(label);
}

function fillSignup({ email = EMAIL, phone = "3001234567" } = {}) {
  fireEvent.change(field(/full name/i), { target: { value: "Ada Lovelace" } });
  fireEvent.change(field(/email address/i), { target: { value: email } });
  fireEvent.change(field(/phone number/i), { target: { value: phone } });
}

function fillPasswords(password = PASSWORD) {
  fireEvent.change(field("Password"), { target: { value: password } });
  fireEvent.change(field(/confirm password/i), { target: { value: password } });
}

function acceptTerms() {
  fireEvent.click(field(/i agree to the terms/i));
}

function submitSignup() {
  fireEvent.click(screen.getByRole("button", { name: /create account/i }));
}

beforeEach(() => {
  signUp.mockReset();
  signIn.mockReset();
  verifyEmail.mockReset();
});

describe("utility integration through the forms", () => {
  it("applies the selected country dial code and strips phone formatting on signup", async () => {
    signUp.mockResolvedValueOnce(undefined);
    renderApp({ route: "/signup" });

    const country = field(/country code/i);
    expect(country.options.length).toBe(COUNTRIES.length);
    expect(country.value).toBe("+92");
    expect(country.options[0].textContent).toContain("🇵🇰");
    expect(country.options[0].textContent).toContain("+92");

    fireEvent.change(country, { target: { value: "+1" } });
    fillSignup({ phone: "(555) 123-4567" });
    fillPasswords();
    acceptTerms();
    submitSignup();

    await screen.findByRole("heading", { name: /check your inbox/i }, { timeout: 4000 });

    expect(signUp.mock.calls[0][0]).toMatchObject({
      email: EMAIL,
      phoneNumber: "+15551234567",
    });
  });

  it("surfaces email-format validation from the real signup form", () => {
    renderApp({ route: "/signup" });

    fillSignup({ email: "ada@example" });
    fillPasswords();
    acceptTerms();
    submitSignup();

    expect(screen.getByText(/enter a valid email address, like you@company.com/i)).toBeTruthy();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("surfaces phone validation and revalidates the touched field", () => {
    renderApp({ route: "/signup" });

    fillSignup({ phone: "123" });
    fillPasswords();
    acceptTerms();
    submitSignup();

    expect(screen.getByText(/enter a valid phone number \(6-15 digits/i)).toBeTruthy();
    expect(signUp).not.toHaveBeenCalled();

    fireEvent.change(field(/phone number/i), { target: { value: "abc123" } });

    expect(screen.getByText(/phone numbers can only contain digits/i)).toBeTruthy();
    expect(screen.queryByText(/enter a valid phone number \(6-15 digits/i)).toBeNull();
  });

  it("accepts a generated password and shows its strength on signup", async () => {
    signUp.mockResolvedValueOnce(undefined);
    renderApp({ route: "/signup" });

    fillSignup();
    fireEvent.click(screen.getByRole("button", { name: /suggest a strong password/i }));

    const generated = field("Password").value;
    expect(generated).toHaveLength(16);
    expect(generated).not.toMatch(/[0O1lI]/);
    expect(field(/confirm password/i).value).toBe(generated);
    expect(screen.getByText(/password strength: very strong/i)).toBeTruthy();

    acceptTerms();
    submitSignup();

    await screen.findByRole("heading", { name: /check your inbox/i }, { timeout: 4000 });
    expect(signUp.mock.calls[0][0].password).toBe(generated);
  });

  it("enforces the password minimum at the login boundary", async () => {
    signIn.mockResolvedValueOnce({ id: 1, email: EMAIL, full_name: "Ada" });
    renderApp({ route: "/login" });

    fireEvent.change(field("Email address"), { target: { value: EMAIL } });
    fireEvent.change(field("Password"), { target: { value: "123456789" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText(/password must be at least 10 characters/i)).toBeTruthy();
    expect(signIn).not.toHaveBeenCalled();

    fireEvent.change(field("Password"), { target: { value: "1234567890" } });
    expect(screen.queryByText(/password must be at least 10 characters/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await screen.findByRole("heading", { name: /welcome, ada/i }, { timeout: 4000 });
    expect(signIn).toHaveBeenCalledWith({
      email: EMAIL,
      password: "1234567890",
      remember: true,
    });
  });

  it("uses the OTP lifetime and validation rules on the verification page", async () => {
    verifyEmail.mockResolvedValueOnce(undefined);
    renderApp({ route: "/verify-email", pendingEmail: EMAIL });

    expect(screen.getByText(/the code expires in 60s/i)).toBeTruthy();

    fireEvent.paste(field("Digit 1 of 6"), {
      clipboardData: { getData: () => "12a4 56" },
    });

    expect(verifyEmail).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /verify email/i }));
    expect(screen.getByText(/enter the full 6-digit code/i)).toBeTruthy();

    fireEvent.paste(field("Digit 1 of 6"), {
      clipboardData: { getData: () => "123456" },
    });

    await screen.findByRole("heading", { name: /email verified/i }, { timeout: 4000 });
    expect(verifyEmail).toHaveBeenCalledWith({ code: "123456", email: EMAIL });
  });
});
