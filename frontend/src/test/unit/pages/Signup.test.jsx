import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  form: {
    values: {},
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

vi.mock("../../../hooks/useAuthForm", () => ({
  useAuthForm: () => mocks.form,
}));

import { Signup } from "../../../pages/Signup";
import { ApiError } from "../../../services/api";

const EMPTY_VALUES = {
  fullName: "",
  email: "",
  phoneDialCode: "+92",
  phoneNumber: "",
  password: "",
  confirmPassword: "",
  terms: false,
};

function renderSignup() {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Signup />
    </MemoryRouter>,
  );
}

function submitForm() {
  fireEvent.submit(screen.getByLabelText(/full name/i).closest("form"));
}

beforeEach(() => {
  Object.assign(mocks.form, {
    values: { ...EMPTY_VALUES },
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

describe("Signup page", () => {
  it("renders every account field and the terms checkbox", () => {
    renderSignup();

    expect(screen.getByRole("heading", { name: /create your account/i })).toBeTruthy();
    expect(screen.getByLabelText(/full name/i).name).toBe("fullName");
    expect(screen.getByLabelText(/email address/i).name).toBe("email");
    expect(screen.getByLabelText(/phone number/i).name).toBe("phoneNumber");
    expect(screen.getByLabelText("Password").type).toBe("password");
    expect(screen.getByLabelText(/confirm password/i).type).toBe("password");
    expect(screen.getByLabelText(/i agree to the terms/i).checked).toBe(false);
    expect(screen.getByRole("link", { name: /sign in/i }).getAttribute("href")).toBe("/login");
  });

  it("reflects supplied values and validation errors", () => {
    mocks.form.values = {
      ...EMPTY_VALUES,
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phoneNumber: "3001234567",
      password: "Str0ngPassphrase!",
      confirmPassword: "Str0ngPassphrase!",
      terms: true,
    };
    mocks.form.errors = {
      fullName: "Full name is required.",
      email: "Enter a valid email address.",
      phoneNumber: "Phone number is required.",
      password: "Password is required.",
      confirmPassword: "Passwords do not match.",
      terms: "You must accept the terms to continue.",
    };
    renderSignup();

    expect(screen.getByLabelText(/full name/i).value).toBe("Ada Lovelace");
    expect(screen.getByLabelText(/email address/i).value).toBe("ada@example.com");
    expect(screen.getByLabelText(/phone number/i).value).toBe("3001234567");
    expect(screen.getByLabelText("Password").value).toBe("Str0ngPassphrase!");
    expect(screen.getByLabelText(/i agree to the terms/i).checked).toBe(true);
    expect(screen.getByText("Full name is required.")).toBeTruthy();
    expect(screen.getByText("Passwords do not match.")).toBeTruthy();
    expect(screen.getByText("You must accept the terms to continue.")).toBeTruthy();
    expect(screen.getByText(/password strength: very strong/i)).toBeTruthy();
  });

  it("renders alerts and maps server errors", () => {
    mocks.form.alert = { variant: "error", message: "Fix the highlighted fields." };
    mocks.form.serverError = new ApiError(422, "Email already registered");
    renderSignup();

    expect(screen.getByText("Fix the highlighted fields.")).toBeTruthy();
    expect(screen.getByText("Email already registered")).toBeTruthy();
  });

  it("switches the submit button into its loading state", () => {
    mocks.form.isSubmitting = true;
    renderSignup();

    const button = screen.getByRole("button", { name: /creating your account/i });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("wires every field to the form hook", () => {
    renderSignup();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "3001234567" } });
    fireEvent.blur(screen.getByLabelText(/email address/i));
    fireEvent.click(screen.getByLabelText(/i agree to the terms/i));
    submitForm();

    expect(mocks.form.setValue).toHaveBeenCalledWith("fullName", "Ada");
    expect(mocks.form.setValue).toHaveBeenCalledWith("email", "ada@example.com");
    expect(mocks.form.setValue).toHaveBeenCalledWith("phoneNumber", "3001234567");
    expect(mocks.form.setValue).toHaveBeenCalledWith("terms", true);
    expect(mocks.form.handleBlur).toHaveBeenCalledWith("email");
    expect(mocks.form.handleSubmit).toHaveBeenCalledTimes(1);
  });

  it("fills both password fields with the suggested password", () => {
    renderSignup();

    fireEvent.click(screen.getByRole("button", { name: /suggest a strong password/i }));

    const passwordCall = mocks.form.setValue.mock.calls.find(([field]) => field === "password");
    const confirmCall = mocks.form.setValue.mock.calls.find(
      ([field]) => field === "confirmPassword",
    );
    expect(passwordCall).toBeTruthy();
    expect(confirmCall).toBeTruthy();
    expect(passwordCall[1]).toHaveLength(16);
    expect(confirmCall[1]).toBe(passwordCall[1]);
  });
});
