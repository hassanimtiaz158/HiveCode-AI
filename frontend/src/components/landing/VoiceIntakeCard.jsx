import { useState } from "react";
import {
  ArrowRight,
  Keyboard,
  Loader2,
  Lock,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { AuthAlert } from "../AuthAlert";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import { transcribeAudio } from "../../services/voiceService";

const SECONDARY_BUTTON =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-5 text-sm font-semibold text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60";

const METER_WEIGHTS = [0.35, 0.55, 0.8, 1, 0.75, 0.55, 0.4];

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function VoiceIntakeCard({ onConfirm }) {
  const recorder = useVoiceRecorder();
  const [mode, setMode] = useState("voice");
  const [textBrief, setTextBrief] = useState("");
  const [phase, setPhase] = useState("capture");
  const [transcript, setTranscript] = useState("");
  const [transcribeError, setTranscribeError] = useState(null);

  function startRecording() {
    setTranscribeError(null);
    recorder.start();
  }

  async function handleTranscribe() {
    if (!recorder.clip) return;
    setTranscribeError(null);
    setPhase("transcribing");
    try {
      const result = await transcribeAudio(recorder.clip.blob);
      setTranscript(result.transcript);
      setPhase("review");
    } catch {
      setTranscribeError("We couldn't transcribe that recording. Please try again or type your brief.");
      setPhase("capture");
    }
  }

  function resetAll() {
    recorder.reset();
    setPhase("capture");
    setTranscript("");
    setTranscribeError(null);
    setTextBrief("");
  }

  function submitText(event) {
    event.preventDefault();
    const value = textBrief.trim();
    if (!value) return;
    setTranscript(value);
    setPhase("review");
  }

  function confirmBrief() {
    if (transcript.trim()) onConfirm();
  }

  function renderVoiceCapture() {
    if (recorder.status === "error") {
      return (
        <div className="space-y-4">
          <AuthAlert message={recorder.error} variant="error" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn-primary sm:flex-1" onClick={startRecording} type="button">
              Try again
            </button>
            <button
              className={SECONDARY_BUTTON}
              onClick={() => setMode("text")}
              type="button"
            >
              <Keyboard className="h-4 w-4" /> Type instead
            </button>
          </div>
        </div>
      );
    }

    if (recorder.status === "requesting") {
      return (
        <div className="flex flex-col items-center gap-3 py-12 text-center" aria-live="polite">
          <Loader2 className="h-8 w-8 animate-spin text-brand-cyan" />
          <p className="text-sm text-slate-300">Waiting for microphone permission...</p>
        </div>
      );
    }

    if (recorder.status === "recording") {
      return (
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <div aria-hidden="true" className="flex h-12 items-end gap-1.5">
            {METER_WEIGHTS.map((weight, index) => (
              <span
                className="w-1.5 rounded-full bg-brand-cyan transition-[height] duration-100"
                key={index}
                style={{ height: `${Math.max(6, Math.round(recorder.level * 40 * weight))}px` }}
              />
            ))}
          </div>
          <p aria-live="polite" className="font-mono text-3xl font-semibold text-white">
            {formatTime(recorder.seconds)}
          </p>
          {recorder.seconds >= 3 && !recorder.heardSound ? (
            <p aria-live="polite" className="text-xs leading-relaxed text-amber-300">
              We&apos;re not picking up any sound. Check that your microphone isn&apos;t muted, or
              choose a different microphone below.
            </p>
          ) : null}
          <div className="flex items-center gap-4">
            <button
              className="btn-primary w-auto px-6"
              onClick={recorder.stop}
              type="button"
            >
              <Square className="h-4 w-4" /> Stop
            </button>
            <button
              className="btn-link inline-flex items-center gap-1.5 text-sm"
              onClick={recorder.cancel}
              type="button"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      );
    }

    if (recorder.status === "recorded" && recorder.clip) {
      return (
        <div className="space-y-4">
          {recorder.clip.silent ? (
            <AuthAlert
              message="This recording is silent. Check that your microphone isn't muted, then record again."
              variant="error"
            />
          ) : null}
          <div className="rounded-2xl border border-white/10 bg-navy-900/60 p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-200">Recording ready</span>
              <span className="text-slate-400">
                {formatTime(Math.round(recorder.clip.durationMs / 1000))}
              </span>
            </div>
            <audio className="w-full" controls src={recorder.clip.url} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className={SECONDARY_BUTTON} onClick={startRecording} type="button">
              <RotateCcw className="h-4 w-4" /> Re-record
            </button>
            <button
              className="btn-primary sm:flex-1"
              disabled={recorder.clip.silent}
              onClick={handleTranscribe}
              type="button"
            >
              <Sparkles className="h-4 w-4" /> Transcribe
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <button
          aria-label="Start voice recording"
          className="group flex h-24 w-24 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand-indigo/60 active:scale-[0.98]"
          onClick={startRecording}
          type="button"
        >
          <Mic className="h-9 w-9" />
        </button>
        <div>
          <p className="font-semibold text-white">Tap to speak</p>
          <p className="mt-1 text-sm text-slate-400">Urdu, English, or Roman Urdu</p>
        </div>
        <button
          className="btn-link inline-flex items-center gap-1.5 text-sm"
          onClick={() => setMode("text")}
          type="button"
        >
          <Keyboard className="h-4 w-4" /> Type instead
        </button>
      </div>
    );
  }

  function renderTextCapture() {
    return (
      <form className="space-y-4" onSubmit={submitText}>
        <div>
          <label className="auth-label" htmlFor="landing-text-brief">
            Type your brief
          </label>
          <textarea
            className="auth-field min-h-[140px] resize-y"
            id="landing-text-brief"
            onChange={(event) => setTextBrief(event.target.value)}
            placeholder="A dark blue site for my Lahore leather shop, with a product list and WhatsApp ordering."
            value={textBrief}
          />
        </div>
        <button className="btn-primary" disabled={!textBrief.trim()} type="submit">
          Continue <ArrowRight className="h-4 w-4" />
        </button>
        <button
          className="btn-link inline-flex items-center gap-1.5 text-sm"
          onClick={() => setMode("voice")}
          type="button"
        >
          <Mic className="h-4 w-4" /> Use voice instead
        </button>
      </form>
    );
  }

  function renderTranscribing() {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-brand-cyan" />
        <p className="text-sm text-slate-300">Transcribing your brief...</p>
        <p className="text-xs text-slate-500">Demo mode: this transcript is simulated.</p>
      </div>
    );
  }

  function renderReview() {
    return (
      <div className="space-y-4">
        <div>
          <label className="auth-label" htmlFor="landing-review-transcript">
            Your brief
          </label>
          <textarea
            className="auth-field min-h-[140px] resize-y"
            id="landing-review-transcript"
            onChange={(event) => setTranscript(event.target.value)}
            value={transcript}
          />
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            Fix anything the microphone got wrong before continuing.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className={SECONDARY_BUTTON} onClick={resetAll} type="button">
            Start over
          </button>
          <button
            className="btn-primary sm:flex-1"
            disabled={!transcript.trim()}
            onClick={confirmBrief}
            type="button"
          >
            Confirm &amp; continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-card backdrop-blur sm:p-7">
      <header className="mb-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-cyan">
          <Mic className="h-3.5 w-3.5" /> Voice intake
        </span>
        <h2 className="mt-4 text-2xl font-semibold text-white">Tell us what to build</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
          Speak for as long as you need. We&apos;ll turn it into a brief you can edit before the
          agents start.
        </p>
      </header>

      {transcribeError ? (
        <div className="mb-4">
          <AuthAlert message={transcribeError} variant="error" />
        </div>
      ) : null}

      {phase === "transcribing" ? renderTranscribing() : null}
      {phase === "review" ? renderReview() : null}
      {phase === "capture" ? (mode === "voice" ? renderVoiceCapture() : renderTextCapture()) : null}

      {phase === "capture" && mode === "voice" && recorder.devices.length > 1 ? (
        <label className="mt-5 block text-left">
          <span className="auth-label">Microphone</span>
          <select
            className="auth-field"
            disabled={recorder.status === "requesting" || recorder.status === "recording"}
            onChange={(event) => recorder.selectDevice(event.target.value)}
            value={recorder.selectedDeviceId}
          >
            {recorder.selectedDeviceId ? null : <option value="">System default</option>}
            {recorder.devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <p className="mt-6 flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed text-slate-500">
        <Lock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Audio stays in your browser in this demo. Transcription is simulated.
      </p>
    </section>
  );
}
