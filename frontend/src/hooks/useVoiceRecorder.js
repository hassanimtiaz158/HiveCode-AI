import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SECONDS = 60;
const MIN_DURATION_MS = 1000;

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

/** Captures a single microphone clip and exposes it as a Blob plus object URL. */
export function useVoiceRecorder(maxSeconds = MAX_SECONDS) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef(null);
  const clipUrlRef = useRef(null);
  const discardRef = useRef(false);

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

  const releaseClipUrl = useCallback(() => {
    if (clipUrlRef.current) {
      URL.revokeObjectURL(clipUrlRef.current);
      clipUrlRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    stopTimer();
    releaseStream();
    recorderRef.current = null;
  }, [releaseStream, stopTimer]);

  const start = useCallback(async () => {
    releaseClipUrl();
    setClip(null);
    setError(null);
    setSeconds(0);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("error");
      setError("This browser doesn't support voice recording. Please type your brief instead.");
      return;
    }

    setStatus("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      discardRef.current = false;
      startedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const durationMs = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        teardown();

        if (discardRef.current) {
          discardRef.current = false;
          setSeconds(0);
          setStatus("idle");
          return;
        }

        if (durationMs < MIN_DURATION_MS) {
          setError("That recording was too short. Hold the mic for at least one second.");
          setStatus("error");
          return;
        }

        const url = URL.createObjectURL(blob);
        clipUrlRef.current = url;
        setClip({ blob, url, mimeType: blob.type, durationMs });
        setSeconds(Math.round(durationMs / 1000));
        setStatus("recorded");
      };

      recorder.onerror = () => {
        teardown();
        setError("Recording stopped unexpectedly. Please try again.");
        setStatus("error");
      };

      recorder.start();
      setStatus("recording");

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= maxSeconds && recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      }, 250);
    } catch (captureError) {
      releaseStream();
      setError(describeMicError(captureError));
      setStatus("error");
    }
  }, [maxSeconds, releaseClipUrl, releaseStream, teardown]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const cancel = useCallback(() => {
    discardRef.current = true;
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      return;
    }
    teardown();
    setError(null);
    setSeconds(0);
    setStatus("idle");
  }, [teardown]);

  const reset = useCallback(() => {
    teardown();
    releaseClipUrl();
    setClip(null);
    setError(null);
    setSeconds(0);
    setStatus("idle");
  }, [releaseClipUrl, teardown]);

  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        if (recorder.state === "recording") recorder.stop();
      }
      teardown();
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
    },
    [teardown]
  );

  return { status, error, seconds, clip, maxSeconds, start, stop, cancel, reset };
}
