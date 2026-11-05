import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthLayout } from "../../../components/AuthLayout";

describe("AuthLayout", () => {
  it("renders page content inside the auth shell", () => {
    render(
      <AuthLayout>
        <h2>Welcome back</h2>
      </AuthLayout>
    );

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeTruthy();
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByText("Speak it. We build it.")).toBeTruthy();
  });

  it("shows the brand in both desktop and mobile headers", () => {
    render(<AuthLayout>content</AuthLayout>);

    expect(screen.getAllByText("Voice-to-Website AI")).toHaveLength(2);
  });

  it("lists the product benefits", () => {
    render(<AuthLayout>content</AuthLayout>);

    expect(screen.getByText("Voice and text briefs")).toBeTruthy();
    expect(screen.getByText("Sandboxed builds and tests")).toBeTruthy();
    expect(screen.getByText("Version history and rollback")).toBeTruthy();
  });
});
