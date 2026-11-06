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
  });

  it("shows the brand header", () => {
    render(<AuthLayout>content</AuthLayout>);

    expect(screen.getAllByText("HiveCode AI")).toHaveLength(1);
  });
});
