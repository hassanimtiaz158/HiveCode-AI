import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhoneInput } from "../../../components/PhoneInput";
import { COUNTRIES } from "../../../utils/countries";

function renderPhoneInput(overrides = {}) {
  const props = {
    dialCode: "+92",
    national: "",
    onDialCodeChange: vi.fn(),
    onNationalChange: vi.fn(),
    onBlur: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<PhoneInput {...props} />) };
}

describe("PhoneInput", () => {
  it("renders every supported country code", () => {
    renderPhoneInput();

    const select = screen.getByLabelText("Country code");
    expect(select.options).toHaveLength(COUNTRIES.length);
    expect(select.value).toBe("+92");
    expect(select.options[0].textContent).toContain("+92");
  });

  it("reports country-code and phone-number changes", () => {
    const { props } = renderPhoneInput();

    fireEvent.change(screen.getByLabelText("Country code"), { target: { value: "+44" } });
    expect(props.onDialCodeChange).toHaveBeenCalledTimes(1);

    const national = screen.getByLabelText("Phone number");
    fireEvent.change(national, { target: { value: "7700 900123" } });
    expect(props.onNationalChange).toHaveBeenCalledTimes(1);

    fireEvent.blur(national);
    expect(props.onBlur).toHaveBeenCalledTimes(1);
  });

  it("links the error to the number field", () => {
    renderPhoneInput({ error: "Enter a valid phone number." });

    const national = screen.getByLabelText("Phone number");
    const error = screen.getByRole("alert");

    expect(error.textContent).toBe("Enter a valid phone number.");
    expect(national.getAttribute("aria-invalid")).toBe("true");
    expect(national.getAttribute("aria-describedby")).toBe(error.id);
  });
});
