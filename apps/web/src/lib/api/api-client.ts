"use client";

import {
  clearStoredAuth,
  getStoredAuth,
  setStoredAuth,
  type StoredAuth,
} from "@/lib/auth/auth-storage";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

type ApiFetchOptions = RequestInit & {
  accessToken?: string;
};

type ErrorPayload = {
  message?: string | string[];
};

let refreshRequestPromise: Promise<string | null> | null = null;

export class ApiClientError extends Error {
  status: number;
  body: string;

  constructor(status: number, message: string, body: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
  }
}

function resolveErrorMessage(status: number, statusText: string, body: string): string {
  const fallbackMessage = `API request failed: ${status} ${statusText}`;

  if (!body) {
    return fallbackMessage;
  }

  try {
    const parsed = JSON.parse(body) as ErrorPayload;

    if (Array.isArray(parsed.message)) {
      return parsed.message.join(" ");
    }

    if (typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    return `${fallbackMessage} ${body}`;
  }

  return fallbackMessage;
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.text();
    throw new ApiClientError(
      response.status,
      resolveErrorMessage(response.status, response.statusText, errorBody),
      errorBody
    );
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

async function performFetch<T>(
  path: string,
  options: ApiFetchOptions,
  accessTokenOverride?: string
): Promise<T> {
  const { accessToken, headers, ...init } = options;
  const requestHeaders = new Headers(headers);
  const isFormDataRequest =
    typeof FormData !== "undefined" && init.body instanceof FormData;

  if (!isFormDataRequest && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (accessTokenOverride ?? accessToken) {
    requestHeaders.set(
      "Authorization",
      `Bearer ${accessTokenOverride ?? accessToken}`
    );
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
  });

  return parseApiResponse<T>(response);
}

async function refreshAccessToken(): Promise<string | null> {
  const storedAuth = getStoredAuth();

  if (!storedAuth?.refreshToken) {
    clearStoredAuth();
    return null;
  }

  if (refreshRequestPromise) {
    return refreshRequestPromise;
  }

  refreshRequestPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken: storedAuth.refreshToken,
        }),
        cache: "no-store",
      });

      const refreshedAuth = await parseApiResponse<StoredAuth>(response);
      const nextAuth: StoredAuth = {
        ...storedAuth,
        ...refreshedAuth,
        user: refreshedAuth.user ?? storedAuth.user,
      };

      setStoredAuth(nextAuth);
      return nextAuth.accessToken;
    } catch {
      clearStoredAuth();
      return null;
    } finally {
      refreshRequestPromise = null;
    }
  })();

  return refreshRequestPromise;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  try {
    return await performFetch<T>(path, options);
  } catch (error) {
    if (
      !(error instanceof ApiClientError) ||
      error.status !== 401 ||
      !options.accessToken ||
      path === "/auth/refresh"
    ) {
      throw error;
    }

    const refreshedAccessToken = await refreshAccessToken();

    if (!refreshedAccessToken) {
      throw error;
    }

    return performFetch<T>(path, options, refreshedAccessToken);
  }
}
