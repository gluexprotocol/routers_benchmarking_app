export const fetchWithETag = async <T>(
  url: string,
  etag?: string,
  signal?: AbortSignal
): Promise<{ status: number; etag?: string; json?: T }> => {
  const res = await fetch(url, {
    method: "GET",
    headers: etag ? { "If-None-Match": etag } : undefined,
    signal,
  });

  if (res.status === 304) {
    return { status: 304, etag, json: undefined };
  }

  const newTag = res.headers.get("etag") ?? undefined;

  if (!res.ok) {
    let msg = "Request failed";

    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      // ignore JSON parsing errors
    }

    throw new Error(msg);
  }

  const json = (await res.json()) as T;

  return { status: res.status, etag: newTag, json };
};

export const withRetry = async <T>(
  fn: (attempt: number) => Promise<T>,
  retries = 2
) => {
  let attempt = 0;

  while (true) {
    try {
      return await fn(attempt);
    } catch (e) {
      if (attempt >= retries) {
        throw e;
      }

      // 250ms, 500ms, ...
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 250));

      attempt++;
    }
  }
};
