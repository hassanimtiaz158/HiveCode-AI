import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "../../../services/api";

function jsonResponse(status, body, statusText = "") {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  };
}

function textResponse(status, statusText, raw) {
  return {
    ok: false,
    status,
    statusText,
    json: async () => {
      throw new SyntaxError("Unexpected token");
    },
    text: async () => raw,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api()", () => {
  it("calls the versioned endpoint with cookies and JSON headers", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com" }),
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/auth/login");
    expect(init.credentials).toBe("include");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(init.body).toBe(JSON.stringify({ email: "a@b.com" }));
  });

  it("lets callers override the request init", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await api("/files", { method: "PUT", headers: { "X-Trace": "1" } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PUT");
    expect(init.headers).toEqual({ "X-Trace": "1" });
  });

  it("returns undefined for 204 responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(204, null)));

    await expect(api("/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });

  it("throws ApiError with a string detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(401, { detail: "Email or password is incorrect." }, "Unauthorized"),
      ),
    );

    const error = await api("/auth/login", { method: "POST" }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.detail).toBe("Email or password is incorrect.");
    expect(error.message).toBe("Email or password is incorrect.");
  });

  it("formats FastAPI validation errors into a field message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(422, {
          detail: [{ loc: ["body", "email"], msg: "value is not a valid email" }],
        }),
      ),
    );

    const error = await api("/auth/signup", { method: "POST" }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.detail).toBe("The email value was rejected: value is not a valid email");
  });

  it("falls back to statusText when the body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => textResponse(502, "Bad Gateway", "<html>bad gateway</html>")),
    );

    const error = await api("/auth/me").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
    expect(error.detail).toBe("Bad Gateway");
  });

  it("uses a generic message when neither body nor statusText helps", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        statusText: "",
        json: async () => ({}),
      })),
    );

    const error = await api("/auth/me").catch((e) => e);

    expect(error.detail).toBe("Something went wrong. Please try again.");
  });
});
