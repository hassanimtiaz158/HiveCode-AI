import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  slots: 2,
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

import { VerifyEmail } from "../../../pages/VerifyEmail";
import { useAuth } from "../../../store/auth";

const EMAIL = "ada@example.com";

function renderVerify() {
  return render(<VerifyEmail />);
}

function pasteCode(code) {
  fireEvent.paste(screen.getByLabelText("Digit 1 of 6"), {
    clipboardData: { getData: () => code },
  });
}

beforeEach(() => {
  mocks.navigate.mockReset();
  mocks.cursor = 0;
  mocks.mutations = [];
  mocks.initial = {};
  useAuth.setState({ user: null, status: "idle", pendingEmail: EMAIL });
});

describe("VerifyEmail page", () => {
  it("redirects to signup when no email is pending", () => {
    useAuth.setState({ pendingEmail: null });

    const { container } = renderVerify();

    expect(mocks.navigate).toHaveBeenCalledWith("/signup", { replace: true });
    expect(container.innerHTML).toBe("");
  });

  it("shows the destination address and the code expiry", () => {
    renderVerify();

    expect(screen.getByRole("heading", { name: /check your inbox/i })).toBeTruthy();
    expect(screen.getByText(EMAIL)).toBeTruthy();
    expect(screen.getByText(/the code expires in 60s/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /verify email/i }).disabled).toBe(false);
  });

  it("submits the code as soon as six digits are present", () => {
    renderVerify();

    pasteCode("123456");

    expect(mocks.mutations[0].mutate).toHaveBeenCalledWith("123456");
  });

  it("rejects an incomplete code without calling the API", () => {
    renderVerify();

    fireEvent.click(screen.getByRole("button", { name: /verify email/i }));

    expect(screen.getByText(/enter the 6-digit code from your email/i)).toBeTruthy();
    expect(mocks.mutations[0].mutate).not.toHaveBeenCalled();
  });

  it("disables the inputs and button while verifying", () => {
    mocks.initial[0] = { isPending: true };
    renderVerify();

    const button = screen.getByRole("button", { name: /verifying/i });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByLabelText("Digit 1 of 6").disabled).toBe(true);
  });

  it("maps a failed verification into an alert", () => {
    mocks.initial[0] = { error: new Error("That code is incorrect.") };
    renderVerify();

    expect(screen.getByRole("alert").textContent).toContain("That code is incorrect.");
  });

  it("shows the success screen and continues to sign in", () => {
    renderVerify();

    act(() => mocks.mutations[0].options.onSuccess());

    expect(screen.getByRole("heading", { name: /email verified/i })).toBeTruthy();
    expect(screen.getByText(new RegExp(`${EMAIL} is confirmed`))).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /continue to sign in/i }));

    expect(mocks.navigate).toHaveBeenCalledWith("/login");
  });

  it("disables resending while the request is in flight", () => {
    mocks.initial[1] = { isPending: true };
    renderVerify();

    expect(screen.getByRole("button", { name: /sending/i }).disabled).toBe(true);
  });

  it("clears the code, announces the resend and starts the cooldown", () => {
    renderVerify();
    pasteCode("123456");

    act(() => mocks.mutations[1].options.onSuccess());

    expect(screen.getByRole("status").textContent).toContain(
      "a fresh 6-digit code is on its way",
    );
    expect(screen.getByLabelText("Digit 1 of 6").value).toBe("");
    expect(mocks.mutations[0].reset).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /resend code in 60s/i }).disabled).toBe(true);
  });

  it("offers a way back to signup", () => {
    renderVerify();

    fireEvent.click(screen.getByRole("button", { name: /back to sign up/i }));

    expect(mocks.navigate).toHaveBeenCalledWith("/signup");
  });
});
