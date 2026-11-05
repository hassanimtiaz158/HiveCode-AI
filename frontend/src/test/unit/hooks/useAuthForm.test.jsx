import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthForm } from "../../../hooks/useAuthForm";

function wrapper({ children }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function setup(overrides = {}) {
  const onSubmit = overrides.onSubmit ?? vi.fn();
  const props = {
    initialValues: { email: "", remember: true },
    validators: {
      email: (value) => (value.includes("@") ? undefined : "Enter a valid email."),
    },
    onSubmit,
    ...overrides,
  };
  const hook = renderHook(() => useAuthForm(props), { wrapper });
  return { ...hook, onSubmit };
}

const submitEvent = () => ({ preventDefault: vi.fn() });

describe("useAuthForm", () => {
  it("exposes initial values and updates them", () => {
    const { result } = setup();
    expect(result.current.values).toEqual({ email: "", remember: true });

    act(() => result.current.setValue("email", "a@b.com"));
    expect(result.current.values.email).toBe("a@b.com");
  });

  it("validates a field on blur and revalidates once touched", () => {
    const { result } = setup();

    act(() => result.current.handleBlur("email"));
    expect(result.current.errors.email).toBe("Enter a valid email.");

    act(() => result.current.setValue("email", "a@b.com"));
    expect(result.current.errors.email).toBeUndefined();
  });

  it("blocks submit and raises an alert when validation fails", async () => {
    const { result, onSubmit } = setup({ invalidMessage: "Fix the form." });
    const event = submitEvent();

    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.errors.email).toBe("Enter a valid email.");
    expect(result.current.alert).toEqual({ variant: "error", message: "Fix the form." });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid values and shows a success message", async () => {
    const onSubmit = vi.fn(async () => "Saved.");
    const { result } = setup({ onSubmit });

    act(() => result.current.setValue("email", "a@b.com"));

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    // React Query passes a mutation context as the second argument.
    expect(onSubmit.mock.calls[0][0]).toEqual({ email: "a@b.com", remember: true });
    expect(result.current.alert).toEqual({ variant: "success", message: "Saved." });
    expect(result.current.isSubmitting).toBe(false);
  });

  it("keeps a rejected submission in serverError without a success alert", async () => {
    const failure = new Error("boom");
    const onSubmit = vi.fn().mockRejectedValue(failure);
    const { result } = setup({ onSubmit });

    act(() => result.current.setValue("email", "a@b.com"));

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    await waitFor(() => expect(result.current.serverError).toBe(failure));
    expect(result.current.alert).toBeNull();
  });

  it("clears an alert when the user edits a field", () => {
    const { result } = setup();

    act(() => result.current.setAlert({ variant: "error", message: "Nope" }));
    expect(result.current.alert).not.toBeNull();

    act(() => result.current.setValue("email", "a"));
    expect(result.current.alert).toBeNull();
  });
});
