import Constants from 'expo-constants';
import type { Capabilities, CardSecret, Transaction, VirtualCard } from './types';

/**
 * A phone on the same wifi cannot reach "localhost". Expo tells us the IP the packager
 * is served from, which is the same machine the API runs on, so reuse its host.
 */
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any)?.expoGoConfig?.debuggerHost;
  const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : null;
  return host ? `http://${host}:4242` : 'http://localhost:4242';
}

export const API_BASE = resolveBaseUrl();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

export const api = {
  status: () => request<{ capabilities: Capabilities }>('/api/status'),

  listCards: () => request<{ cards: VirtualCard[]; capabilities: Capabilities }>('/api/cards'),

  getCard: (id: string) => request<{ card: VirtualCard; transactions: Transaction[] }>(`/api/cards/${id}`),

  createCard: (input: {
    merchantName: string;
    limitAmount: number;
    interval: string;
    expiresInDays: number | null;
    merchantLocked: boolean;
  }) => request<{ card: VirtualCard }>('/api/cards', { method: 'POST', body: JSON.stringify(input) }),

  secret: (id: string) => request<{ secret: CardSecret }>(`/api/cards/${id}/secret`),

  setStatus: (id: string, status: 'active' | 'paused') =>
    request<{ card: VirtualCard }>(`/api/cards/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  deleteCard: (id: string) => request<{ ok: boolean }>(`/api/cards/${id}`, { method: 'DELETE' }),

  charge: (id: string, amount: number, merchantName?: string) =>
    request<{ approved: boolean; transaction: Transaction; card: VirtualCard }>(`/api/cards/${id}/charge`, {
      method: 'POST',
      body: JSON.stringify({ amount, merchantName }),
    }),
};

export const money = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const intervalLabel = (interval: string) =>
  interval === 'per_authorization' ? 'per purchase' : interval === 'monthly' ? 'per month' : `per ${interval}`;
