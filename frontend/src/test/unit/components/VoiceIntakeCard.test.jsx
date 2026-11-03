import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceIntakeCard } from "../../../components/landing/VoiceIntakeCard";
import { useVoiceRecorder } from "../../../hooks/useVoiceRecorder";
import { transcribeAudio } from "../../../services/voiceService";

vi.mock("../../../hooks/useVoiceRecorder", () => ({ useVoiceRecorder: vi.fn() }));
vi.mock("../../../services/voiceService", () => ({ transcribeAudio: vi.fn() }));

const idleRecorder = {
  status: "idle",
  error: null,
  seconds: 0,
  clip: null,
  level: 0,
  heardSound: false,
  devices: [],
  selectedDeviceId: "",
  selectDevice: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  cancel: vi.fn(),
  reset: vi.fn(),
};

function setRecorder(overrides = {}) {
  const recorder = { ...idleRecorder, ...overrides };
  useVoiceRecorder.mockReturnValue(recorder);
  return recorder;
}

beforeEach(() => {
  vi.clearAllMocks();
  transcribeAudio.mockReset();
  setRecorder();
});

describe("VoiceIntakeCard unit", () => {
  it("starts recording from the idle state", () => {
    const recorder = setRecorder();
    render(<VoiceIntakeCard onConfirm={vi.fn()} />);

    expect(screen.getByText("Tap to speak")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start voice recording" }));

    expect(recorder.start).toHaveBeenCalledTimes(1);
  });

  it("shows the permission-pending state", () => {
    setRecorder({ status: "requesting" });
    render(<VoiceIntakeCard onConfirm={vi.fn()} />);

    expect(screen.getByText("Waiting for microphone permission...")).toBeTruthy();
  });

  it("shows the timer and controls while recording", () => {
    const recorder = setRecorder({
      status: "recording",
      seconds: 65,
      level: 0.8,
      heardSound: true,
    });
    render(<VoiceIntakeCard onConfirm={vi.fn()} />);

    expect(screen.getByText("1:05")).toBeTruthy();
    expect(screen.queryByText(/not picking up any sound/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(recorder.stop).toHaveBeenCalledTimes(1);
    expect(recorder.cancel).toHaveBeenCalledTimes(1);
  });

  it("warns when a silent input produces no sound for three seconds", () => {
    setRecorder({ status: "recording", seconds: 3, heardSound: false });
    render(<VoiceIntakeCard onConfirm={vi.fn()} />);

    expect(screen.getByText(/not picking up any sound/i)).toBeTruthy();
  });

  it("plays a recorded clip and transcribes it", async () => {
    const blob = new Blob(["audio"], { type: "audio/webm" });
    setRecorder({
      status: "recorded",
      seconds: 2,
      clip: { blob, url: "blob:clip", durationMs: 2500, silent: false },
    });
    transcribeAudio.mockResolvedValue({ transcript: "A bakery site with a menu." });
    render(<VoiceIntakeCard onConfirm={vi.fn()} />);

    expect(screen.getByText("Recording ready")).toBeTruthy();
    expect(screen.getByText("0:03")).toBeTruthy();
    expect(document.querySelector("audio").getAttribute("src")).toBe("blob:clip");

    fireEvent.click(screen.getByRole("button", { name: "Transcribe" }));
    expect(screen.getByText("Transcribing your brief...")).toBeTruthy();

    const area = await screen.findByLabelText("Your brief");
    expect(area.value).toBe("A bakery site with a menu.");
    expect(transcribeAudio).toHaveBeenCalledWith(blob);
  });

  it("blocks transcription of a silent clip", () => {
    setRecorder({
      status: "recorded",
      clip: { blob: new Blob(["x"]), url: "blob:silent", durationMs: 2000, silent: true },
    });
    render(<VoiceIntakeCard onConfirm={vi.fn()} />);

    expect(screen.getByText(/This recording is silent/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Transcribe" }).disabled).toBe(true);
  });

  it("recovers from a capture error or switches to text", () => {
    const recorder = setRecorder({ status: "error", error: "Microphone access was blocked." });
    render(<VoiceIntakeCard onConfirm={vi.fn()} />);

    expect(screen.getByText("Microphone access was blocked.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(recorder.start).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Type instead" }));
    expect(screen.getByLabelText("Type your brief")).toBeTruthy();
  });

  it("submits a typed brief for review and confirmation", () => {
    const onConfirm = vi.fn();
    render(<VoiceIntakeCard onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Type instead" }));

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Type your brief"), {
      target: { value: "A salon site with bookings." },
    });
    fireEvent.click(continueButton);

    const review = screen.getByLabelText("Your brief");
    expect(review.value).toBe("A salon site with bookings.");

    fireEvent.click(screen.getByRole("button", { name: "Confirm & continue" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("reports a transcription failure and stays on the recording", async () => {
    setRecorder({
      status: "recorded",
      clip: { blob: new Blob(["x"]), url: "blob:clip", durationMs: 2000, silent: false },
    });
    transcribeAudio.mockRejectedValue(new Error("network"));
    render(<VoiceIntakeCard onConfirm={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Transcribe" }));

    expect(await screen.findByText(/couldn't transcribe that recording/i)).toBeTruthy();
    expect(screen.getByText("Recording ready")).toBeTruthy();
  });

  it("lets the user choose among multiple microphones", () => {
    const recorder = setRecorder({
      devices: [
        { id: "mic-a", label: "Laptop Mic" },
        { id: "mic-b", label: "USB Mic" },
      ],
      selectedDeviceId: "mic-a",
    });
    render(<VoiceIntakeCard onConfirm={vi.fn()} />);

    const select = screen.getByLabelText("Microphone");
    expect(select.value).toBe("mic-a");

    fireEvent.change(select, { target: { value: "mic-b" } });
    expect(recorder.selectDevice).toHaveBeenCalledWith("mic-b");
  });

  it("hides the picker when only one input exists", () => {
    setRecorder({ devices: [{ id: "mic-a", label: "Laptop Mic" }] });
    render(<VoiceIntakeCard onConfirm={vi.fn()} />);

    expect(screen.queryByLabelText("Microphone")).toBeNull();
  });
});
