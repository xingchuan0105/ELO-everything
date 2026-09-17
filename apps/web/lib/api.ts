/**
 * Same-origin base path — browser talks to Next (:3100), which proxies to Nest (:3001).
 * This keeps elo_session cookies on the web origin.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api/v1";

function friendlyError(data: unknown, statusText: string): string {
  if (!data || typeof data !== "object") return statusText || "请求失败";
  const d = data as Record<string, unknown>;
  if (typeof d.message === "string") return d.message;
  if (Array.isArray(d.message)) return d.message.join("；");
  const err = d.error as Record<string, unknown> | undefined;
  if (err && typeof err.message === "string") return err.message;
  try {
    return JSON.stringify(data);
  } catch {
    return statusText || "请求失败";
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(friendlyError(data, res.statusText));
  }
  return data as T;
}
