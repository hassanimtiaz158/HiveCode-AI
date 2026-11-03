import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthButton } from "../../../components/AuthButton";

describe("AuthButton", () => {
  it("defaults to a submit button and forwards clicks", () => {
    const onClick = vi.fn();
    render(<AuthButton onClick={onClick}>Sign In</AuthButton>);

    const button = screen.getByRole("button", { name: "Sign In" });
    expect(button.type).toBe("submit");
    expect(button.disabled).toBe(false);

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables itself and marks busy while loading", () => {
    const { container } = render(<AuthButton loading>Signing in...</AuthButton>);

    const button = screen.getByRole("button", { name: "Signing in..." });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("keeps an explicit button type and disabled prop", () => {
    render(
      <AuthButton disabled type="button">
        Cancel
      </AuthButton>
    );

    const button = screen.getByRole("button", { name: "Cancel" });
    expect(button.type).toBe("button");
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBeNull();
  });
});
