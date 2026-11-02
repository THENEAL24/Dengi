const DEFAULT_BASE = '/api/v1';

export function syncApiBase(): string {
  const fromEnv = import.meta.env.VITE_SYNC_API_BASE as string | undefined;
  if (fromEnv?.trim()) return fromEnv.replace(/\/$/, '');
  return DEFAULT_BASE;
}

export function syncApiUrl(path: string): string {
  const base = syncApiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  if (base.startsWith('http')) return `${base}${p}`;
  if (typeof window !== 'undefined') return `${window.location.origin}${base}${p}`;
  return `${base}${p}`;
}

export async function syncFetch(
  path: string,
  init: RequestInit & { syncSecret?: string } = {},
): Promise<Response> {
  const { syncSecret, headers, ...rest } = init;
  const h = new Headers(headers);
  if (syncSecret) h.set('Authorization', `Bearer ${syncSecret}`);
  h.set('Content-Type', 'application/json');
  return fetch(syncApiUrl(path), { ...rest, headers: h });
}

export type EnrollResponse = {
  deviceId: string;
  webhookToken: string;
  syncSecret: string;
};

export async function apiEnroll(): Promise<EnrollResponse> {
  const res = await syncFetch('/enroll', { method: 'POST', body: '{}' });
  if (!res.ok) {
    let reason = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string; reason?: string };
      if (body.reason) reason = body.reason;
      else if (body.error) reason = body.error;
    } catch {
      reason = `HTTP ${res.status}`;
    }
    throw new Error(reason);
  }
  return res.json() as Promise<EnrollResponse>;
}

export async function apiRevoke(syncSecret: string): Promise<void> {
  await syncFetch('/revoke', { method: 'POST', syncSecret, body: '{}' });
}

export type ServerEvent = {
  id: string;
  v: 1;
  alg: 'A256GCM';
  kid: 'ingress';
  iv: string;
  ct: string;
  ts: number;
};

export async function apiFetchEvents(
  syncSecret: string,
  cursor?: string,
): Promise<{ events: ServerEvent[]; nextCursor: string | null }> {
  const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const res = await syncFetch(`/events${q}`, { method: 'GET', syncSecret });
  if (!res.ok) throw new Error('events failed');
  return res.json() as Promise<{ events: ServerEvent[]; nextCursor: string | null }>;
}

export async function apiAckEvents(syncSecret: string, ids: string[]): Promise<void> {
  const res = await syncFetch('/events/ack', {
    method: 'POST',
    syncSecret,
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error('ack failed');
}

export async function apiPostHook(webhookToken: string, body: unknown): Promise<void> {
  const res = await fetch(syncApiUrl(`/hooks/${webhookToken}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('hook failed');
}

export function webhookUrl(webhookToken: string): string {
  return syncApiUrl(`/hooks/${webhookToken}`);
}

export function shortcutImportUrl(webhookToken: string, ingressKey: string): string {
  const setup = syncApiUrl(
    `/shortcuts/bank-sms?token=${encodeURIComponent(webhookToken)}&key=${encodeURIComponent(ingressKey)}`,
  );
  return `shortcuts://import-shortcut?url=${encodeURIComponent(setup)}`;
}
