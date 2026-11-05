import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeAudio } from "../../../services/voiceService";

afterEach(() => {
  vi.useRealTimers();
});

describe("transcribeAudio()", () => {
  it("returns the simulated transcript in the expected shape", async () => {
    const result = await transcribeAudio(new Blob(["audio"], { type: "audio/webm" }));

    expect(typeof result.transcript).toBe("string");
    expect(result.transcript.length).toBeGreaterThan(0);
    expect(result.language).toBe("en");
    expect(result.simulated).toBe(true);
  });

  it("waits for the simulated network delay before resolving", async () => {
    vi.useFakeTimers();
    let settled = false;

    const pending = transcribeAudio(new Blob(["audio"])).then((value) => {
      settled = true;
      return value;
    });

    await vi.advanceTimersByTimeAsync(1399);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toMatchObject({ simulated: true });
    expect(settled).toBe(true);
  });

  it("ignores the audio payload (placeholder implementation)", async () => {
    const first = await transcribeAudio(new Blob(["first"]));
    const second = await transcribeAudio(new Blob(["completely different audio"]));

    expect(first.transcript).toBe(second.transcript);
  });
});
