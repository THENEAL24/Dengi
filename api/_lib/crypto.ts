export function randomToken(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex}`;
}

export async function hashSha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function blobDedupKey(iv: string, ct: string): Promise<string> {
  return hashSha256(`${iv}:${ct}`);
}
