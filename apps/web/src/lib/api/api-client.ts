const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

type ApiFetchOptions = RequestInit & {
  accessToken?: string;
};

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

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { accessToken, headers, ...init } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = `API request failed: ${response.status} ${response.statusText}`;

    if (errorBody) {
      try {
        const parsed = JSON.parse(errorBody) as { message?: string | string[] };

        if (Array.isArray(parsed.message)) {
          message = parsed.message.join(" ");
        } else if (typeof parsed.message === "string") {
          message = parsed.message;
        }
      } catch {
        message = `${message} ${errorBody}`;
      }
    }

    throw new ApiClientError(response.status, message, errorBody);
  }




  if (response.status === 204) {
    return undefined as unknown as T;
  }





  
  return response.json() as Promise<T>;
}
