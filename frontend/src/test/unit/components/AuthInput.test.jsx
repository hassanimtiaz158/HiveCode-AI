import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuthInput } from "../../../components/AuthInput";

describe("AuthInput", () => {
  it("associates the label and forwards input props", () => {
    const onChange = vi.fn();
    render(
      <AuthInput label="Email address" name="email" onChange={onChange} value="" />
    );

    const input = screen.getByLabelText("Email address");
    expect(input.name).toBe("email");
    expect(input.type).toBe("text");

    fireEvent.change(input, { target: { value: "you@company.com" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("toggles password visibility", () => {
    render(<AuthInput label="Password" type="password" value="" />);

    const input = screen.getByLabelText("Password");
    expect(input.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input.type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input.type).toBe("password");
  });

  it("shows an error instead of the hint and exposes it to assistive tech", () => {
    render(
      <AuthInput error="Email is required." hint="Use a work email." label="Email address" />
    );

    const input = screen.getByLabelText("Email address");
    const error = screen.getByRole("alert");

    expect(error.textContent).toBe("Email is required.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
    expect(screen.queryByText("Use a work email.")).toBeNull();
    expect(input.className).toContain("auth-field--invalid");
  });

  it("shows a hint and links it when there is no error", () => {
    render(<AuthInput hint="At least 10 characters." label="Password" type="password" value="" />);

    const input = screen.getByLabelText("Password");
    const hint = screen.getByText("At least 10 characters.");
    expect(input.getAttribute("aria-describedby")).toBe(hint.id);
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("forwards a ref to the native input", () => {
    const ref = createRef();
    render(<AuthInput label="Email address" ref={ref} value="" />);

    expect(ref.current).toBe(screen.getByLabelText("Email address"));
  });

  it("renders trailing content", () => {
    render(
      <AuthInput
        label="Password"
        trailing={<button type="button">Suggest</button>}
        type="password"
        value=""
      />
    );

    expect(screen.getByRole("button", { name: "Suggest" })).toBeTruthy();
  });
});
