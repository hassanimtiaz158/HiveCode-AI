import { ApiError, api } from "./api";

const GENERIC_LOGIN_ERROR = "Email or password is incorrect.";

export function signUp(input) {
  return api("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      full_name: input.fullName.trim(),
      phone_number: input.phoneNumber,
    }),
  });
}

export async function signIn(input) {
  const response = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      remember_me: input.remember,
    }),
  });
  return response.user;
}

export function fetchCurrentUser() {
  return api("/auth/me");
}

export function signOut() {
  return api("/auth/logout", { method: "POST" });
}

export function verifyEmail(input) {
  return api("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      code: input.code,
    }),
  });
}

export function resendVerificationCode(input) {
  return api("/auth/resend-code", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
    }),
  });
}

export function forgotPassword(input) {
  return api("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
    }),
  });
}

export function resetPassword(input) {
  return api("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      code: input.code,
      password: input.password,
    }),
  });
}

/** True when a failure means the account still needs email verification. */
export function isUnverifiedError(error) {
  return error instanceof ApiError && error.status === 403;
}

/** True when the auth API is missing, down or failing, so local sign-in can stand in. */
export function isAuthServiceUnavailable(error) {
  if (error instanceof ApiError) {
    return error.status === 404 || error.status === 405 || error.status >= 500;
  }
  return error instanceof TypeError;
}

export function toAuthErrorMessage(error, fallback = GENERIC_LOGIN_ERROR) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return "Invalid code. Check the code and try again.";
      case 401:
        return GENERIC_LOGIN_ERROR;
      case 403:
        return "That email hasn't been verified yet. Enter the 6-digit code we sent you.";
      case 429:
        return "Too many attempts. Please wait a few minutes before trying again.";
      case 404:
      case 405:
        return "The sign-in service isn't available yet - this API endpoint hasn't shipped.";
      default:
        return error.detail || fallback;
    }
  }
  if (error instanceof TypeError) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  return error instanceof Error ? error.message : fallback;
}
