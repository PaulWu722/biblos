// Supabase project shared with the old biblos site; the publishable key is meant to be public.
const SB = 'https://gserdnkovlwfdgcaguqe.supabase.co';
const KEY = 'sb_publishable_OkPLiqg_-Jnu1ywt8j-o0A_R_BFyIZN';

export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args),
  });
  const text = await r.text();
  const json = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error(json?.message ?? `HTTP ${r.status}`);
  return json as T;
}

// Same key as the old site, so people already signed in there stay signed in.
const TOKEN_KEY = 'bk_token';
export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null): void => { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); };

export interface Me { id: number; nick: string; }
export type LoginResult = { need_nick: true } | { token: string; me: Me };
export const login = (phone: string, nick?: string) => rpc<LoginResult>('biblos_login', { p_phone: phone, p_nick: nick ?? null });
export const fetchMe = (token: string) => rpc<Me | null>('biblos_me', { p_token: token });
