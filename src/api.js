export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json")) throw new ApiError("API is unavailable", response.status);
  const payload = await response.json();
  if (!response.ok) throw new ApiError(payload.error || "请求失败", response.status);
  return payload;
}

