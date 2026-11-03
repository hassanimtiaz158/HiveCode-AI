import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VoiceIntakeCard } from "./VoiceIntakeCard";
import { installMicHarness } from "../../test/micHarness";

const wait = (ms) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

let harness;

afterEach(() => {
  harness?.restore();
  harness = null;
});

describe("VoiceIntakeCard microphone flow", () => {
  it("records, stops, transcribes and confirms an audible brief", async () => {
    harness = installMicHarness();
    const onConfirm = vi.fn();
    render(<VoiceIntakeCard onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: /start voice recording/i }));
    await screen.findByRole("button", { name: /^stop$/i });
    await wait(1200);
    fireEvent.click(screen.getByRole("button", { name: /^stop$/i }));

    await screen.findByText(/recording ready/i);
    expect(screen.queryByText(/this recording is silent/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /transcribe/i }));
    const area = await screen.findByLabelText(/your brief/i, {}, { timeout: 4000 });
    expect(area.value).toMatch(/leather goods shop/i);

    fireEvent.click(screen.getByRole("button", { name: /confirm & continue/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("warns about a silent recording and blocks transcription", async () => {
    harness = installMicHarness({ silent: true });
    render(<VoiceIntakeCard onConfirm={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /start voice recording/i }));
    await screen.findByRole("button", { name: /^stop$/i });
    await wait(1200);
    fireEvent.click(screen.getByRole("button", { name: /^stop$/i }));

    await screen.findByText(/this recording is silent/i);
    expect(screen.getByRole("button", { name: /transcribe/i }).disabled).toBe(true);
  });

  it("shows a no-sound hint while recording from a silent input", async () => {
    harness = installMicHarness({ silent: true });
    render(<VoiceIntakeCard onConfirm={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /start voice recording/i }));
    await screen.findByRole("button", { name: /^stop$/i });
    await screen.findByText(/not picking up any sound/i, {}, { timeout: 5000 });
  });

  it("lets the user choose a microphone and re-record with it", async () => {
    harness = installMicHarness();
    render(<VoiceIntakeCard onConfirm={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /start voice recording/i }));
    const select = await screen.findByLabelText(/microphone/i);
    expect(select.disabled).toBe(true);

    await wait(1200);
    fireEvent.click(screen.getByRole("button", { name: /^stop$/i }));
    await screen.findByText(/recording ready/i);
    await waitFor(() => expect(select.disabled).toBe(false));

    fireEvent.change(select, { target: { value: "mic-usb" } });
    fireEvent.click(screen.getByRole("button", { name: /re-record/i }));

    await waitFor(() =>
      expect(harness.getUserMedia).toHaveBeenLastCalledWith({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          deviceId: { exact: "mic-usb" },
        },
      })
    );
    await screen.findByRole("button", { name: /^stop$/i });
  });

  it("explains when the browser cannot record", async () => {
    vi.stubGlobal("MediaRecorder", undefined);
    render(<VoiceIntakeCard onConfirm={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /start voice recording/i }));

    await screen.findByText(/doesn't support voice recording/i);
  });
});
