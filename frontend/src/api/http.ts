const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  const json = (await r.json()) as {
    header: { success: boolean; message?: string };
    data: T | null;
  };
  if (!json.header?.success || !json.data) throw new Error(json.header?.message ?? 'Unknown error');
  return json.data;
}

export async function apiPost<TReq, TRes>(path: string, body: TReq, token?: string): Promise<TRes> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const json = (await r.json()) as {
    header: { success: boolean; message?: string };
    data: TRes | null;
  };
  if (!json.header?.success || !json.data) throw new Error(json.header?.message ?? 'Unknown error');
  return json.data;
}
