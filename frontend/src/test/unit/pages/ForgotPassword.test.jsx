import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  slots: 3,
  cursor: 0,
  mutations: [],
  initial: {},
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options) => {
    const slot = mocks.cursor;
    mocks.cursor = (mocks.cursor + 1) % mocks.slots;
    if (!mocks.mutations[slot]) {
      mocks.mutations[slot] = {
        options,
        mutate: vi.fn(),
        reset: vi.fn(),
        isPending: false,
        error: null,
        ...(mocks.initial[slot] ?? {}),
      };
    }
    mocks.mutations[slot].options = options;
    return mocks.mutations[slot];
  },
}));

import { ForgotPassword } from "../../../pages/ForgotPassword";

const EMAIL = "ada@example.com";
const PASSWORD = "NewStr0ngPassphrase!";

function renderForgotPassword() {
  return render(<ForgotPassword />);
}

function requestReset() {
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: EMAIL },
  });
  fireEvent.submit(screen.getByLabelText(/email address/i).closest("form"));
}

function moveToCodeStep() {
  requestReset();
  act(() => mocks.mutations[0].options.onSuccess());
}

function pasteCode(code = "654321") {
  fireEvent.paste(screen.getByLabelText("Digit 1 of 6"), {
    clipboardData: { getData: () => code },
  });
}

function moveToPasswordStep() {
  moveToCodeStep();
  pasteCode();
  fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
}

function fillPassword(password = PASSWORD, confirm = PASSWORD) {
  fireEvent.change(screen.getByLabelText(/^new password$/i), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText(/confirm new password/i), {
    target: { value: confirm },
  });
  fireEvent.submit(screen.getByLabelText(/^new password$/i).closest("form"));
}

beforeEach(() => {
  mocks.navigate.mockReset();
  mocks.cursor = 0;
  mocks.mutations = [];
  mocks.initial = {};
});

describe("ForgotPassword page", () => {
  it("starts on the email step", () => {
    renderForgotPassword();

    expect(screen.getByRole("heading", { name: /forgot your password/i })).toBeTruthy();
    expect(screen.getByText(/we'll send you a 6-digit reset code/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /send reset code/i }).type).toBe("submit");

    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(mocks.navigate).toHaveBeenCalledWith("/login");
  });

  it("validates the email before requesting a code", () => {
    renderForgotPassword();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "not-an-email" },
    });
    fireEvent.submit(screen.getByLabelText(/email address/i).closest("form"));

    expect(screen.getByText(/enter a valid email address/i)).toBeTruthy();
    expect(mocks.mutations[0].mutate).not.toHaveBeenCalled();
  });

  it("requests a code, moves to the code step and starts the cooldown", () => {
    renderForgotPassword();

    requestReset();

    expect(mocks.mutations[0].mutate).toHaveBeenCalledWith(EMAIL);

    act(() => mocks.mutations[0].options.onSuccess());

    expect(screen.getByRole("heading", { name: /enter the reset code/i })).toBeTruthy();
    expect(screen.getByText(new RegExp(EMAIL))).toBeTruthy();
    expect(screen.getByRole("button", { name: /resend in 60s/i }).disabled).toBe(true);
  });

  it("disables the request button while the code is being sent", () => {
    mocks.initial[0] = { isPending: true };
    renderForgotPassword();

    const button = screen.getByRole("button", { name: /sending code/i });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("maps a request failure into an alert", () => {
    mocks.initial[0] = { error: new Error("Mailbox unavailable") };
    renderForgotPassword();

    expect(screen.getByRole("alert").textContent).toContain("Mailbox unavailable");
  });

  it("shows the code validation message on the code step", () => {
    renderForgotPassword();
    moveToCodeStep();

    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));

    expect(screen.getByText(/enter the 6-digit code from your email/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /enter the reset code/i })).toBeTruthy();
  });

  it("advances to the password step with a complete code", () => {
    renderForgotPassword();
    moveToPasswordStep();

    expect(screen.getByRole("heading", { name: /choose a new password/i })).toBeTruthy();
    expect(screen.getByText(/make it at least 10 characters/i)).toBeTruthy();
  });

  it("disables resending while the resend is in flight", () => {
    mocks.initial[1] = { isPending: true };
    renderForgotPassword();
    moveToCodeStep();

    expect(screen.getByRole("button", { name: /sending/i }).disabled).toBe(true);
  });

  it("blocks mismatched passwords before resetting", () => {
    renderForgotPassword();
    moveToPasswordStep();

    fillPassword(PASSWORD, "different-password");

    expect(screen.getByText(/passwords do not match/i)).toBeTruthy();
    expect(mocks.mutations[2].mutate).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: /choose a new password/i })).toBeTruthy();
  });

  it("submits the reset and shows the confirmation screen", () => {
    renderForgotPassword();
    moveToPasswordStep();

    fillPassword();

    expect(mocks.mutations[2].mutate).toHaveBeenCalledTimes(1);

    act(() => mocks.mutations[2].options.onSuccess());

    expect(screen.getByRole("heading", { name: /password updated/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /continue to sign in/i }));
    expect(mocks.navigate).toHaveBeenCalledWith("/login");
  });

  it("disables the reset button while the password is updating", () => {
    mocks.initial[2] = { isPending: true };
    renderForgotPassword();
    moveToPasswordStep();

    const button = screen.getByRole("button", { name: /updating password/i });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("can go back to the email step", () => {
    renderForgotPassword();
    moveToCodeStep();

    fireEvent.click(screen.getByRole("button", { name: /use a different email/i }));

    expect(screen.getByRole("heading", { name: /forgot your password/i })).toBeTruthy();
    expect(screen.getByLabelText(/email address/i).value).toBe(EMAIL);
  });

  it("can go back from the password step to the code step", () => {
    renderForgotPassword();
    moveToPasswordStep();

    fireEvent.click(screen.getByRole("button", { name: /back to the code/i }));

    expect(screen.getByRole("heading", { name: /enter the reset code/i })).toBeTruthy();
  });
});
