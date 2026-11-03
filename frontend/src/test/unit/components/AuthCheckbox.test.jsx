import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthCheckbox } from "../../../components/AuthCheckbox";

describe("AuthCheckbox", () => {
  it("associates the label with the checkbox and reports changes", () => {
    let checkedAtChange;
    const onChange = vi.fn((event) => {
      checkedAtChange = event.target.checked;
    });
    render(<AuthCheckbox checked={false} label="Remember me" onChange={onChange} />);

    const checkbox = screen.getByLabelText("Remember me");
    expect(checkbox.type).toBe("checkbox");

    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledTimes(1);
    // React restores a controlled checkbox immediately, so read the value inside the handler.
    expect(checkedAtChange).toBe(true);
  });

  it("links validation errors to the checkbox", () => {
    render(<AuthCheckbox error="You must accept the terms." label="I agree" />);

    const checkbox = screen.getByLabelText("I agree");
    const error = screen.getByRole("alert");

    expect(error.textContent).toBe("You must accept the terms.");
    expect(checkbox.getAttribute("aria-invalid")).toBe("true");
    expect(checkbox.getAttribute("aria-describedby")).toBe(error.id);
  });

  it("omits error attributes when valid", () => {
    render(<AuthCheckbox label="I agree" />);

    const checkbox = screen.getByLabelText("I agree");
    expect(checkbox.getAttribute("aria-invalid")).toBeNull();
    expect(checkbox.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
