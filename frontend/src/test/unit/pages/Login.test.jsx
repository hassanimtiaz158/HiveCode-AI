import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  form: {
    values: { email: "", password: "", remember: true },
    errors: {},
    alert: null,
    setValue: vi.fn(),
    handleBlur: vi.fn(),
    handleSubmit: vi.fn(),
    formRef: { current: null },
    isSubmitting: false,
    serverError: null,
  },
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("../../../hooks/useAuthForm", () => ({
  useAuthForm: () => mocks.form,
}));

import { Login } from "../../../pages/Login";
import { ApiError } from "../../../services/api";

function renderLogin() {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Login />
    </MemoryRouter>,
  );
}

function submitForm() {
  fireEvent.submit(screen.getByLabelText("Email address").closest("form"));
}

beforeEach(() => {
  mocks.navigate.mockReset();
  Object.assign(mocks.form, {
    values: { email: "", password: "", remember: true },
    errors: {},
    alert: null,
    formRef: { current: null },
    isSubmitting: false,
    serverError: null,
  });
  mocks.form.setValue.mockReset();
  mocks.form.handleBlur.mockReset();
  mocks.form.handleSubmit.mockReset();
});

describe("Login page", () => {
  it("renders the sign-in form", () => {
    renderLogin();

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
    expect(screen.getByLabelText("Email address").type).toBe("text");
    expect(screen.getByLabelText("Password").type).toBe("password");
    expect(screen.getByLabelText(/remember me/i).checked).toBe(true);
    expect(screen.getByRole("button", { name: /sign in/i }).type).toBe("submit");
    expect(screen.getByRole("link", { name: /create an account/i }).getAttribute("href")).toBe(
      "/signup",
    );
  });

  it("shows the values and field errors supplied by the form hook", () => {
    mocks.form.values = { email: "ada@example.com", password: "Secret#123", remember: false };
    mocks.form.errors = { email: "Enter a valid email address." };
    renderLogin();

    expect(screen.getByLabelText("Email address").value).toBe("ada@example.com");
    expect(screen.getByLabelText("Password").value).toBe("Secret#123");
    expect(screen.getByLabelText(/remember me/i).checked).toBe(false);
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
  });

  it("renders a form alert and maps a server error to safe copy", () => {
    mocks.form.alert = { variant: "success", message: "Signed in." };
    mocks.form.serverError = new ApiError(401, "Invalid credentials");
    renderLogin();

    expect(screen.getByRole("status").textContent).toContain("Signed in.");
    expect(screen.getByRole("alert").textContent).toContain("Email or password is incorrect.");
  });

  it("switches the submit button into its loading state", () => {
    mocks.form.isSubmitting = true;
    renderLogin();

    const button = screen.getByRole("button", { name: /signing in/i });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("wires field changes, blurs and submission to the form hook", () => {
    renderLogin();

    const email = screen.getByLabelText("Email address");
    fireEvent.change(email, { target: { value: "ada@example.com" } });
    fireEvent.blur(email);
    submitForm();

    expect(mocks.form.setValue).toHaveBeenCalledWith("email", "ada@example.com");
    expect(mocks.form.handleBlur).toHaveBeenCalledWith("email");
    expect(mocks.form.handleSubmit).toHaveBeenCalledTimes(1);
  });

  it("passes the remember-me choice through the form hook", () => {
    renderLogin();

    fireEvent.click(screen.getByLabelText(/remember me/i));

    expect(mocks.form.setValue).toHaveBeenCalledWith("remember", false);
  });

  it("opens the password recovery page", () => {
    renderLogin();

    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));

    expect(mocks.navigate).toHaveBeenCalledWith("/forgot-password");
  });
});
