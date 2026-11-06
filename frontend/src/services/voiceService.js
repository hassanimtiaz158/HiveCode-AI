const MOCK_TRANSCRIPT =
  "I run a leather goods shop in Lahore. I want a clean website with my products, prices, and a WhatsApp order button. Please use dark blue and gold colours.";

// Placeholder until the Whisper transcription endpoint ships.
export async function transcribeAudio(_audioBlob) {
  await new Promise((resolve) => setTimeout(resolve, 1400));
  return { transcript: MOCK_TRANSCRIPT, language: "en", simulated: true };
}
