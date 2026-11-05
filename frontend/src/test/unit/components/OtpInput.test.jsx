import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OtpInput } from "../../../components/OtpInput";

describe("OtpInput", () => {
  it("renders six single-digit boxes", () => {
    render(<OtpInput value="" onChange={vi.fn()} />);

    const boxes = screen.getAllByRole("textbox");
    expect(boxes).toHaveLength(6);
    expect(boxes[0].getAttribute("autocomplete")).toBe("one-time-code");
    expect(boxes[0].getAttribute("inputmode")).toBe("numeric");
    expect(boxes[0].getAttribute("maxlength")).toBe("1");
  });

  it("accepts one digit, drops non-digits, and advances focus", () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    const boxes = screen.getAllByRole("textbox");

    fireEvent.change(boxes[0], { target: { value: "7" } });
    expect(onChange).toHaveBeenLastCalledWith("7");
    expect(document.activeElement).toBe(boxes[1]);

    fireEvent.change(boxes[1], { target: { value: "x" } });
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(document.activeElement).toBe(boxes[1]);
  });

  it("calls onComplete when the sixth digit is entered", () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    render(<OtpInput onChange={onChange} onComplete={onComplete} value="12345" />);

    fireEvent.change(screen.getAllByRole("textbox")[5], { target: { value: "6" } });

    expect(onChange).toHaveBeenCalledWith("123456");
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("pastes a full numeric code and ignores non-numeric input", () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    const { rerender } = render(
      <OtpInput onChange={onChange} onComplete={onComplete} value="" />
    );
    const first = screen.getAllByRole("textbox")[0];

    fireEvent.paste(first, { clipboardData: { getData: () => "12-34-56" } });
    expect(onChange).toHaveBeenLastCalledWith("123456");
    expect(onComplete).toHaveBeenLastCalledWith("123456");

    rerender(<OtpInput onChange={onChange} onComplete={onComplete} value="" />);
    fireEvent.paste(first, { clipboardData: { getData: () => "abc" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("clears the current digit on Backspace, or the previous one when empty", () => {
    const onChange = vi.fn();
    const { rerender } = render(<OtpInput onChange={onChange} value="123456" />);
    let boxes = screen.getAllByRole("textbox");

    fireEvent.keyDown(boxes[5], { key: "Backspace" });
    expect(onChange).toHaveBeenLastCalledWith("12345");

    rerender(<OtpInput onChange={onChange} value="12" />);
    boxes = screen.getAllByRole("textbox");
    boxes[2].focus();
    fireEvent.keyDown(boxes[2], { key: "Backspace" });
    expect(onChange).toHaveBeenLastCalledWith("1");
    expect(document.activeElement).toBe(boxes[1]);
  });

  it("moves focus with the arrow keys without editing", () => {
    const onChange = vi.fn();
    render(<OtpInput onChange={onChange} value="" />);
    const boxes = screen.getAllByRole("textbox");

    boxes[0].focus();
    fireEvent.keyDown(boxes[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(boxes[1]);

    fireEvent.keyDown(boxes[1], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(boxes[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("snaps focus back to the first empty box", () => {
    render(<OtpInput onChange={vi.fn()} value="1" />);
    const boxes = screen.getAllByRole("textbox");

    boxes[3].focus();

    expect(document.activeElement).toBe(boxes[1]);
  });

  it("disables every box when disabled", () => {
    render(<OtpInput disabled onChange={vi.fn()} value="" />);

    screen.getAllByRole("textbox").forEach((box) => {
      expect(box.disabled).toBe(true);
    });
  });
});
