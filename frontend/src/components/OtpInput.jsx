import { useRef } from "react";

const LENGTH = 6;

/**
 * Six-box code entry. Typing auto-advances, Backspace steps back, arrows move
 * without editing, and pasting a full code fills every box. Focus on a box past
 * the first empty slot snaps back so the value always stays contiguous.
 */
export function OtpInput({ value = "", onChange, onComplete, error, disabled }) {
  const refs = useRef([]);
  // Focus moves we initiate must not be undone by the onFocus snap-back, which
  // still sees the value from before the keystroke re-rendered.
  const programmaticFocus = useRef(false);
  const chars = value.split("");

  const focusBox = (index) => {
    const clamped = Math.min(Math.max(index, 0), LENGTH - 1);
    const node = refs.current[clamped];
    if (!node) return;
    programmaticFocus.current = true;
    node.focus();
    node.select();
    programmaticFocus.current = false;
  };

  const commit = (nextChars, focusIndex) => {
    const next = nextChars.slice(0, LENGTH).join("");
    onChange(next);
    if (focusIndex != null) focusBox(focusIndex);
    if (next.length === LENGTH) onComplete?.(next);
  };

  const firstEmpty = () => {
    for (let i = 0; i < LENGTH; i += 1) {
      if (!chars[i]) return i;
    }
    return LENGTH - 1;
  };

  const handleChange = (index, raw) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const nextChars = [...chars];
    for (let i = nextChars.length; i < index; i += 1) nextChars[i] = "";
    nextChars[index] = digit;
    commit(nextChars, digit ? index + 1 : index);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const nextChars = [...chars];
      if (nextChars[index]) {
        nextChars[index] = "";
        commit(nextChars, index);
      } else if (index > 0) {
        nextChars[index - 1] = "";
        commit(nextChars, index - 1);
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight" && index < LENGTH - 1) {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = (event.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    commit(pasted.split(""), pasted.length);
  };

  return (
    <div className="flex justify-between gap-2 sm:gap-3">
      {Array.from({ length: LENGTH }, (_, index) => (
        <input
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          className={`auth-field aspect-square w-0 min-w-0 flex-1 px-0 text-center text-xl font-semibold ${
            error ? "auth-field--invalid" : ""
          }`}
          disabled={disabled}
          inputMode="numeric"
          key={index}
          maxLength={1}
          name={index === 0 ? "code" : undefined}
          onChange={(event) => handleChange(index, event.target.value)}
          onFocus={() => {
            if (programmaticFocus.current) return;
            const target = firstEmpty();
            if (index > target) focusBox(target);
          }}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          pattern="[0-9]*"
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="text"
          value={chars[index] ?? ""}
        />
      ))}
    </div>
  );
}
