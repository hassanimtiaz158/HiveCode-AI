import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVoiceRecorder } from "./useVoiceRecorder";
import { installMicHarness } from "../test/micHarness";

const STORAGE_KEY = "voiceIntake.micId";

const tick = (ms) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

const advanceClock = (ms) => vi.setSystemTime(new Date(Date.now() + ms));

let harness;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
});

afterEach(() => {
  harness?.restore();
  harness = null;
  vi.useRealTimers();
});

describe("useVoiceRecorder", () => {
  it("requests the default microphone and enters recording", async () => {
    harness = installMicHarness();
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });

    expect(harness.getUserMedia).toHaveBeenCalledWith({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    expect(result.current.status).toBe("recording");
    expect(result.current.error).toBeNull();
  });

  it("explains that voice recording needs localhost or HTTPS", async () => {
    harness = installMicHarness();
    vi.stubGlobal("isSecureContext", false);
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/localhost or over HTTPS/i);
    expect(harness.getUserMedia).not.toHaveBeenCalled();
  });

  it("keeps recording when a headset briefly reports the track as muted", async () => {
    harness = installMicHarness({ trackState: { muted: true } });
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe("recording");
    expect(result.current.error).toBeNull();
    expect(harness.track.stop).not.toHaveBeenCalled();
  });

  it("refuses to record when the microphone track is disabled", async () => {
    harness = installMicHarness({ trackState: { enabled: false } });
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/disabled/i);
    expect(harness.track.stop).toHaveBeenCalled();
  });

  it("refuses to record when the microphone track is not live", async () => {
    harness = installMicHarness({ trackState: { readyState: "ended" } });
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/didn't start properly/i);
    expect(harness.track.stop).toHaveBeenCalled();
  });

  it("stops on demand and exposes an audible clip", async () => {
    harness = installMicHarness();
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });
    await tick(160);
    expect(result.current.level).toBeGreaterThan(0);
    expect(result.current.heardSound).toBe(true);

    advanceClock(2200);
    act(() => {
      result.current.stop();
    });

    expect(result.current.status).toBe("recorded");
    expect(result.current.clip.blob.size).toBeGreaterThan(0);
    expect(result.current.clip.durationMs).toBe(2200);
    expect(result.current.clip.silent).toBe(false);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(harness.track.stop).toHaveBeenCalled();
  });

  it("flags a clip as silent when the meter never hears sound", async () => {
    harness = installMicHarness({ silent: true });
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });
    await tick(160);
    expect(result.current.level).toBe(0);
    expect(result.current.heardSound).toBe(false);

    advanceClock(2200);
    act(() => {
      result.current.stop();
    });

    expect(result.current.status).toBe("recorded");
    expect(result.current.clip.silent).toBe(true);
  });

  it("keeps recording past 60 seconds until the user stops", async () => {
    harness = installMicHarness();
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });
    advanceClock(61000);
    await tick(1100);

    expect(result.current.status).toBe("recording");
    expect(result.current.seconds).toBeGreaterThanOrEqual(61);

    act(() => {
      result.current.stop();
    });

    expect(result.current.status).toBe("recorded");
    expect(result.current.clip.durationMs).toBeGreaterThanOrEqual(61000);
  });

  it("rejects recordings shorter than one second", async () => {
    harness = installMicHarness();
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });
    act(() => {
      result.current.stop();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/too short/i);
    expect(result.current.clip).toBeNull();
  });

  it("rejects a recording when no audio data arrives", async () => {
    harness = installMicHarness({ emitAudio: false });
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });
    advanceClock(2200);
    act(() => {
      result.current.stop();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/didn't receive any audio/i);
  });

  it("uses the selected microphone for the next recording", async () => {
    harness = installMicHarness();
    const { result } = renderHook(() => useVoiceRecorder());

    act(() => {
      result.current.selectDevice("mic-usb");
    });
    await act(async () => {
      await result.current.start();
    });

    expect(harness.getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        deviceId: { exact: "mic-usb" },
      },
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("mic-usb");
  });

  it("falls back to the system default when a saved device is gone", async () => {
    localStorage.setItem(STORAGE_KEY, "mic-gone");
    harness = installMicHarness();
    harness.getUserMedia.mockRejectedValueOnce(
      Object.assign(new Error("device missing"), { name: "OverconstrainedError" })
    );
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });

    expect(harness.getUserMedia).toHaveBeenNthCalledWith(1, {
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        deviceId: { exact: "mic-gone" },
      },
    });
    expect(harness.getUserMedia).toHaveBeenNthCalledWith(2, {
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    expect(result.current.status).toBe("recording");
    expect(result.current.selectedDeviceId).toBe("mic-default");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("mic-default");
  });

  it("lists input devices once permission is granted", async () => {
    harness = installMicHarness();
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });

    await waitFor(() => {
      expect(result.current.devices).toEqual([
        { id: "mic-default", label: "Laptop Mic" },
        { id: "mic-usb", label: "USB Microphone" },
      ]);
    });
  });

  it("cancels without producing a clip", async () => {
    harness = installMicHarness();
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });
    act(() => {
      result.current.cancel();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.clip).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("releases the microphone when the component unmounts", async () => {
    harness = installMicHarness();
    const { result, unmount } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });
    expect(harness.track.stop).not.toHaveBeenCalled();

    unmount();

    expect(harness.track.stop).toHaveBeenCalled();
  });

  it("explains a denied microphone permission and allows a retry", async () => {
    harness = installMicHarness();
    harness.getUserMedia.mockRejectedValueOnce(
      Object.assign(new Error("permission denied"), { name: "NotAllowedError" })
    );
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/access was blocked/i);

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe("recording");
    expect(result.current.error).toBeNull();
  });

  it("ignores a second start while the first is in flight", async () => {
    harness = installMicHarness();
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await Promise.all([result.current.start(), result.current.start()]);
    });

    expect(harness.getUserMedia).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("recording");
  });

  it("stops a microphone stream that arrives after unmount", async () => {
    harness = installMicHarness();
    let resolveStream;
    harness.getUserMedia.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStream = resolve;
        })
    );
    const { result, unmount } = renderHook(() => useVoiceRecorder());

    let pendingStart;
    act(() => {
      pendingStart = result.current.start();
    });
    unmount();

    await act(async () => {
      resolveStream(harness.stream);
      await pendingStart;
    });

    expect(harness.track.stop).toHaveBeenCalled();
    expect(harness.getUserMedia).toHaveBeenCalledTimes(1);
  });
});
