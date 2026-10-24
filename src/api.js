export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api(path, { timeout = 15000, signal, ...options } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException("请求超时", "TimeoutError")), timeout);
  try {
    const response = await fetch(path, {
      credentials: "same-origin",
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...options.headers,
      },
    });
    const type = response.headers.get("content-type") || "";
    if (!type.includes("application/json")) throw new ApiError("服务暂时不可用，请稍后重试", response.status);
    const payload = await response.json();
    if (!response.ok) throw new ApiError(payload.error || "请求失败", response.status);
    return payload;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (controller.signal.aborted) throw new ApiError("请求超时，请检查网络后重试", 408);
    if (error instanceof ApiError) throw error;
    throw new ApiError("网络连接失败，请稍后重试", 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
