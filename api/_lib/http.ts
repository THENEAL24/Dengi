export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function empty(status: number): Response {
  return new Response(null, { status });
}

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};
  return JSON.parse(text) as unknown;
}

export function bearerAuth(request: Request): string | null {
  const h = request.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  return h.slice(7).trim() || null;
}

export function hookTokenFromPath(url: URL): string | null {
  const m = url.pathname.match(/\/api\/v1\/hooks\/([^/]+)\/?$/);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}
