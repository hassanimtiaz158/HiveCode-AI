import { vi } from "vitest";

function createAnalyser(silent) {
  return {
    fftSize: 1024,
    getByteTimeDomainData(buffer) {
      for (let i = 0; i < buffer.length; i += 1) {
        buffer[i] = silent ? 128 : 128 + Math.round(40 * Math.sin(i / 4));
      }
    },
  };
}

export function installMicHarness({ silent = false, emitAudio = true, trackState = {} } = {}) {
  let activeDeviceId = "mic-default";
  const track = {
    kind: "audio",
    enabled: true,
    muted: false,
    readyState: "live",
    stop: vi.fn(),
    getSettings: () => ({ deviceId: activeDeviceId }),
    ...trackState,
  };
  const stream = {
    getTracks: () => [track],
    getAudioTracks: () => [track],
  };

  class MockMediaRecorder {
    static isTypeSupported = vi.fn(() => true);

    constructor(source, options = {}) {
      this.stream = source;
      this.mimeType = options.mimeType || "audio/webm";
      this.state = "inactive";
      this.ondataavailable = null;
      this.onstop = null;
      this.onerror = null;
    }

    start() {
      this.state = "recording";
    }

    stop() {
      if (this.state !== "recording") return;
      this.state = "inactive";
      if (emitAudio) {
        this.ondataavailable?.({ data: new Blob(["voice-chunk"], { type: this.mimeType }) });
      }
      this.onstop?.();
    }
  }

  class MockAudioContext {
    constructor() {
      this.state = "running";
    }

    createAnalyser() {
      return createAnalyser(silent);
    }

    createMediaStreamSource() {
      return { connect: vi.fn() };
    }

    resume() {
      return Promise.resolve();
    }

    close() {
      return Promise.resolve();
    }
  }

  const getUserMedia = vi.fn(async (constraints) => {
    activeDeviceId = constraints?.audio?.deviceId?.exact || "mic-default";
    return stream;
  });
  const enumerateDevices = vi.fn(async () => [
    { kind: "audioinput", deviceId: "mic-default", label: "Laptop Mic" },
    { kind: "audioinput", deviceId: "mic-usb", label: "USB Microphone" },
  ]);

  const originalDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia, enumerateDevices },
  });

  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let urlCount = 0;
  URL.createObjectURL = vi.fn(() => {
    urlCount += 1;
    return `blob:mock-${urlCount}`;
  });
  URL.revokeObjectURL = vi.fn();

  vi.stubGlobal("MediaRecorder", MockMediaRecorder);
  vi.stubGlobal("AudioContext", MockAudioContext);

  return {
    stream,
    track,
    getUserMedia,
    enumerateDevices,
    restore() {
      if (originalDevices) {
        Object.defineProperty(navigator, "mediaDevices", originalDevices);
      } else {
        delete navigator.mediaDevices;
      }
      if (originalCreateObjectURL) URL.createObjectURL = originalCreateObjectURL;
      else delete URL.createObjectURL;
      if (originalRevokeObjectURL) URL.revokeObjectURL = originalRevokeObjectURL;
      else delete URL.revokeObjectURL;
      vi.unstubAllGlobals();
    },
  };
}
