export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;
export const NAME_MIN = 2;
export const NAME_MAX = 80;
export const PHONE_NATIONAL_MIN = 6;
export const PHONE_NATIONAL_MAX = 15;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value) {
  const email = value.trim();
  if (!email) return "Email is required.";
  if (!EMAIL_RE.test(email)) return "Enter a valid email address, like you@company.com.";
  return undefined;
}

export function validateRequiredName(value) {
  const name = value.trim();
  if (!name) return "Full name is required.";
  if (name.length < NAME_MIN) return `Full name must be at least ${NAME_MIN} characters.`;
  if (name.length > NAME_MAX) return `Full name must be ${NAME_MAX} characters or fewer.`;
  return undefined;
}

export function validatePassword(value) {
  if (!value) return "Password is required.";
  if (value.length < PASSWORD_MIN) return `Invalid Password`;
  if (value.length > PASSWORD_MAX) return `Password must be ${PASSWORD_MAX} characters or fewer.`;
  return undefined;
}

export function validateConfirmPassword(password, confirm) {
  if (!confirm) return "Please confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return undefined;
}

export function validateCheckbox(accepted) {
  return accepted ? undefined : "You must accept the terms to continue.";
}

export const OTP_LENGTH = 6;
/** Codes are only accepted for one minute; after that a fresh one is needed. */
export const OTP_TTL_SECONDS = 60;

export function validateOtp(value) {
  const code = String(value ?? "").trim();
  if (!code) return "Enter the 6-digit code from your email.";
  if (!/^\d+$/.test(code)) return "The code contains only digits.";
  if (code.length !== OTP_LENGTH) return `Enter the full ${OTP_LENGTH}-digit code.`;
  return undefined;
}

export function validatePhone(national) {
  const digits = String(national ?? "").replace(/[\s()-]/g, "");
  if (!digits) return "Phone number is required.";
  if (!/^\d+$/.test(digits)) return "Phone numbers can only contain digits.";
  if (digits.length < PHONE_NATIONAL_MIN || digits.length > PHONE_NATIONAL_MAX)
    return `Enter a valid phone number (${PHONE_NATIONAL_MIN}-${PHONE_NATIONAL_MAX} digits, without the country code).`;
  return undefined;
}

export function toE164(dialCode, national) {
  return `${dialCode}${String(national).replace(/[\s()-]/g, "")}`;
}

const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Strong", "Very strong"];
const STRENGTH_BARS = [
  "bg-rose-500",
  "bg-rose-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-emerald-300",
];
const STRENGTH_TEXT = [
  "text-rose-300",
  "text-rose-300",
  "text-amber-200",
  "text-emerald-200",
  "text-emerald-100",
];

export function getPasswordStrength(password) {
  if (!password) return { score: 0, ...style(0) };

  let score = 0;
  if (password.length >= PASSWORD_MIN) score += 1;
  if (password.length >= 14) score += 1;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  if ((hasLower || hasUpper) && (hasDigit || hasSymbol)) score += 1;
  if (hasLower && hasUpper && hasDigit && hasSymbol) score += 1;
  if (password.length >= PASSWORD_MIN && repeatsOnly(password)) score = Math.min(score, 1);

  return { score, ...style(score) };
}

function style(score) {
  return { label: STRENGTH_LABELS[score], bars: STRENGTH_BARS[score], text: STRENGTH_TEXT[score] };
}

function repeatsOnly(password) {
  return new Set(password.toLowerCase()).size <= 2;
}
