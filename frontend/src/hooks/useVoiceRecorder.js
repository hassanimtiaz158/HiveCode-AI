import { useCallback, useEffect, useRef, useState } from "react";

const MIN_DURATION_MS = 1000;
const SILENCE_RMS = 0.005;
const DEVICE_STORAGE_KEY = "voiceIntake.micId";

// Opt in with VITE_VOICE_DEBUG=true in .env.local when diagnosing capture issues.
const VOICE_DEBUG = import.meta.env.DEV && import.meta.env.VITE_VOICE_DEBUG === "true";

// Browser audio processing can zero out the signal on some devices, so capture raw audio.
const RAW_AUDIO_CONSTRAINTS = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported?.(type)) ?? "";
}

function describeMicError(error) {
  switch (error?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone access was blocked. Allow it in your browser settings, or type your brief instead.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No microphone was found on this device. You can type your brief instead.";
    case "NotReadableError":
      return "Your microphone is busy in another app. Close it and try again.";
    default:
      return "We couldn't start the microphone. Please try again or type your brief.";
  }
}

function readStoredDeviceId() {
  try {
    return localStorage.getItem(DEVICE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function storeDeviceId(deviceId) {
  try {
    if (deviceId) localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    else localStorage.removeItem(DEVICE_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private modes; selection still works for this session.
  }
}

/** Captures a single microphone clip and exposes it as a Blob plus object URL. */
export function useVoiceRecorder() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState(null);
  const [level, setLevel] = useState(0);
  const [heardSound, setHeardSound] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(readStoredDeviceId);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef(null);
  const clipUrlRef = useRef(null);
  const discardRef = useRef(false);
  const audioCtxRef = useRef(null);
  const levelTimerRef = useRef(null);
  const peakRef = useRef(0);
  const meterActiveRef = useRef(false);
  const heardRef = useRef(false);
  const startingRef = useRef(false);
  const sessionRef = useRef(0);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopMeter = useCallback(() => {
    if (levelTimerRef.current) {
      clearInterval(levelTimerRef.current);
      levelTimerRef.current = null;
    }
    meterActiveRef.current = false;
    const ctx = audioCtxRef.current;
    audioCtxRef.current = null;
    if (ctx) Promise.resolve(ctx.close?.()).catch(() => {});
  }, []);

  const releaseClipUrl = useCallback(() => {
    if (clipUrlRef.current) {
      URL.revokeObjectURL(clipUrlRef.current);
      clipUrlRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    stopTimer();
    stopMeter();
    releaseStream();
    chunksRef.current = [];
    recorderRef.current = null;
  }, [releaseStream, stopMeter, stopTimer]);

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(
        list
          .filter((device) => device.kind === "audioinput")
          .map((device, index) => ({
            id: device.deviceId,
            label: device.label || `Microphone ${index + 1}`,
          }))
      );
    } catch {
      setDevices([]);
    }
  }, []);

  const startMeter = useCallback((stream) => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = ctx;
      Promise.resolve(ctx.resume?.()).catch(() => {});
      const buffer = new Uint8Array(analyser.fftSize);
      levelTimerRef.current = setInterval(() => {
        if (ctx.state !== "running") return;
        meterActiveRef.current = true;
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          const sample = (buffer[i] - 128) / 128;
          sum += sample * sample;
        }
        const rms = Math.sqrt(sum / buffer.length);
        if (rms > peakRef.current) peakRef.current = rms;
        if (!heardRef.current && rms > SILENCE_RMS) {
          heardRef.current = true;
          setHeardSound(true);
        }
        setLevel(Math.min(1, rms * 5));
      }, 100);
    } catch {
      // Metering is optional; recording still works without it.
    }
  }, []);

  const selectDevice = useCallback((deviceId) => {
    setSelectedDeviceId(deviceId);
    storeDeviceId(deviceId);
  }, []);

  const start = useCallback(async () => {
    if (startingRef.current || recorderRef.current) return;

    releaseClipUrl();
    setClip(null);
    setError(null);
    setSeconds(0);
    setLevel(0);
    setHeardSound(false);
    peakRef.current = 0;
    heardRef.current = false;
    meterActiveRef.current = false;

    if (window.isSecureContext === false) {
      setStatus("error");
      setError(
        "Voice recording needs a secure connection. Open the app on localhost or over HTTPS, or type your brief instead."
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("error");
      setError("This browser doesn't support voice recording. Please type your brief instead.");
      return;
    }

    startingRef.current = true;
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    const isCurrent = () => sessionRef.current === session;

    setStatus("requesting");

    try {
      let stream;
      const requestStream = (deviceId) =>
        navigator.mediaDevices.getUserMedia({
          audio: {
            ...RAW_AUDIO_CONSTRAINTS,
            ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          },
        });

      try {
        stream = await requestStream(selectedDeviceId);
      } catch (captureError) {
        if (!isCurrent()) return;
        const lostSavedDevice =
          selectedDeviceId &&
          (captureError?.name === "OverconstrainedError" ||
            captureError?.name === "NotFoundError");
        if (!lostSavedDevice) {
          setError(describeMicError(captureError));
          setStatus("error");
          return;
        }
        storeDeviceId("");
        setSelectedDeviceId("");
        try {
          stream = await requestStream("");
        } catch (fallbackError) {
          if (!isCurrent()) return;
          setError(describeMicError(fallbackError));
          setStatus("error");
          return;
        }
      }

      // The user may have cancelled, reset, or unmounted while the permission
      // prompt was open; release a stream that arrives after that.
      if (!isCurrent()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const track = stream.getAudioTracks()[0];
      const settings = track?.getSettings?.() ?? {};
      if (VOICE_DEBUG) {
        console.log("[voice] mic track", {
          enabled: track?.enabled,
          muted: track?.muted,
          readyState: track?.readyState,
          settings,
        });
      }

      if (!track) {
        releaseStream();
        setError("No microphone audio track was found. Reconnect your microphone or type your brief instead.");
        setStatus("error");
        return;
      }

      if (track.enabled === false) {
        releaseStream();
        refreshDevices();
        setError("Your microphone is disabled. Enable it in your system sound settings, or choose a different microphone below.");
        setStatus("error");
        return;
      }

      if (track.readyState !== "live") {
        releaseStream();
        refreshDevices();
        setError("Your microphone didn't start properly. Reconnect it or choose a different microphone below.");
        setStatus("error");
        return;
      }

      // Bluetooth/hands-free headsets often report muted briefly while the audio
      // profile switches; the meter and silence warnings catch a truly muted mic.
      if (track.muted === true && VOICE_DEBUG) {
        console.warn("[voice] mic track reports muted at start; continuing", settings);
      }

      try {
        const mimeType = pickMimeType();
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        recorderRef.current = recorder;
        chunksRef.current = [];
        discardRef.current = false;
        startedAtRef.current = Date.now();

        const actualDeviceId = settings.deviceId;
        if (actualDeviceId && actualDeviceId !== selectedDeviceId) {
          setSelectedDeviceId(actualDeviceId);
          storeDeviceId(actualDeviceId);
        }

        recorder.ondataavailable = (event) => {
          if (event.data?.size) {
            if (VOICE_DEBUG) {
              console.log("[voice] chunk received", event.data.size);
            }
            chunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const durationMs = Date.now() - startedAtRef.current;
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const silent = meterActiveRef.current && peakRef.current < SILENCE_RMS;
          if (VOICE_DEBUG) {
            console.log("[voice] clip ready", {
              size: blob.size,
              type: blob.type,
              durationMs,
              silent,
            });
          }
          teardown();

          if (discardRef.current) {
            discardRef.current = false;
            setSeconds(0);
            setStatus("idle");
            return;
          }

          if (!blob.size) {
            setError("We didn't receive any audio. Check that your microphone is connected and try again.");
            setStatus("error");
            return;
          }

          if (durationMs < MIN_DURATION_MS) {
            setError("That recording was too short. Hold the mic for at least one second.");
            setStatus("error");
            return;
          }

          const url = URL.createObjectURL(blob);
          clipUrlRef.current = url;
          setClip({ blob, url, durationMs, silent });
          setSeconds(Math.round(durationMs / 1000));
          setStatus("recorded");
        };

        recorder.onerror = () => {
          teardown();
          setError("Recording stopped unexpectedly. Please try again.");
          setStatus("error");
        };

        // Emit chunks during recording so a long clip isn't lost if the final flush fails.
        recorder.start(1000);
        startMeter(stream);
        refreshDevices();
        setStatus("recording");

        timerRef.current = setInterval(() => {
          setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }, 1000);
      } catch (captureError) {
        teardown();
        setError(describeMicError(captureError));
        setStatus("error");
      }
    } finally {
      if (isCurrent()) startingRef.current = false;
    }
  }, [releaseClipUrl, releaseStream, teardown, refreshDevices, startMeter, selectedDeviceId]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const cancel = useCallback(() => {
    discardRef.current = true;
    sessionRef.current += 1;
    startingRef.current = false;
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      return;
    }
    teardown();
    setError(null);
    setSeconds(0);
    setHeardSound(false);
    setStatus("idle");
  }, [teardown]);

  const reset = useCallback(() => {
    sessionRef.current += 1;
    startingRef.current = false;
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state === "recording") recorder.stop();
    }
    teardown();
    releaseClipUrl();
    setClip(null);
    setError(null);
    setSeconds(0);
    setHeardSound(false);
    setStatus("idle");
  }, [releaseClipUrl, teardown]);

  useEffect(
    () => () => {
      sessionRef.current += 1;
      startingRef.current = false;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state === "recording") recorder.stop();
      }
      teardown();
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
    },
    [teardown]
  );

  return {
    status,
    error,
    seconds,
    clip,
    level,
    heardSound,
    devices,
    selectedDeviceId,
    selectDevice,
    start,
    stop,
    cancel,
    reset,
  };
}
