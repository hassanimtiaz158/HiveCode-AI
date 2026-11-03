import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../helpers/renderApp";

function submitTextBrief(text) {
  fireEvent.click(screen.getByRole("button", { name: /type instead/i }));
  fireEvent.change(screen.getByLabelText(/type your brief/i), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
}

describe("landing brief flow", () => {
  it("sends a signed-out visitor from a typed brief to sign in", () => {
    renderApp({ route: "/landing" });

    submitTextBrief("A bakery site with a menu and delivery details.");

    const review = screen.getByLabelText(/your brief/i);
    expect(review.value).toBe("A bakery site with a menu and delivery details.");

    fireEvent.click(screen.getByRole("button", { name: /confirm & continue/i }));

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
  });

  it("takes an authenticated visitor straight to the dashboard", () => {
    renderApp({ route: "/landing", user: { id: 1, full_name: "Ada Lovelace" } });

    submitTextBrief("A salon page with prices and WhatsApp booking.");
    fireEvent.click(screen.getByRole("button", { name: /confirm & continue/i }));

    expect(screen.getByRole("heading", { name: /welcome, ada lovelace/i })).toBeTruthy();
  });

  it("keeps Continue disabled until the brief has content", () => {
    renderApp({ route: "/landing" });
    fireEvent.click(screen.getByRole("button", { name: /type instead/i }));

    const continueButton = screen.getByRole("button", { name: /continue/i });
    expect(continueButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/type your brief/i), {
      target: { value: "Leather shop" },
    });
    expect(continueButton.disabled).toBe(false);
  });

  it("lets the visitor edit or discard the brief before confirming", () => {
    renderApp({ route: "/landing" });
    submitTextBrief("A wool shop in Multan.");

    fireEvent.change(screen.getByLabelText(/your brief/i), {
      target: { value: "A wool shop in Multan with online ordering." },
    });
    expect(screen.getByLabelText(/your brief/i).value).toContain("online ordering");

    fireEvent.click(screen.getByRole("button", { name: /start over/i }));

    expect(screen.getByLabelText(/type your brief/i).value).toBe("");
    expect(screen.getByRole("button", { name: /continue/i }).disabled).toBe(true);
  });
});
