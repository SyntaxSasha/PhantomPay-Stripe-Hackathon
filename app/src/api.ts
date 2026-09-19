import Constants from 'expo-constants';
import type {
  BillingCycle,
  Capabilities,
  CardSecret,
  Subscription,
  Transaction,
  VirtualCard,
} from './types';

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

interface AppState {
  cards: VirtualCard[];
  subscriptions: Subscription[];
  transactions: Transaction[];
  capabilities: Capabilities;
}

export const CYCLES: BillingCycle[] = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];

export const api = {
  /** Everything the app renders from — cards, subscriptions and capabilities in one call. */
  state: () => request<AppState>('/api/state'),

  getCard: (id: string) => request<{ card: VirtualCard; transactions: Transaction[] }>(`/api/cards/${id}`),

  /** Cards belong to a person, not a merchant — a card has no merchant or limit until linked. */
  createCard: (input: { cardHolder: string }) =>
    request<{ card: VirtualCard }>('/api/cards', {
      method: 'POST',
      body: JSON.stringify({ cardHolder: input.cardHolder, cardType: 'Visa', isDefault: false }),
    }),

  createSubscription: (input: { name: string; price: number; billingCycle: BillingCycle }) =>
    request<{ subscription: Subscription }>('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        description: '',
        startDate: new Date().toISOString().slice(0, 10),
      }),
    }),

  /** Binding a card to a subscription is what turns it into a merchant-specific credential. */
  link: (subscriptionId: string, cardId: string | null) =>
    request<{ subscription: Subscription; cards: VirtualCard[] }>(
      `/api/subscriptions/${subscriptionId}/link`,
      { method: 'POST', body: JSON.stringify({ cardId }) },
    ),

  secret: (id: string) => request<{ secret: CardSecret }>(`/api/cards/${id}/secret`),

  setStatus: (id: string, status: 'active' | 'paused') =>
    request<{ card: VirtualCard }>(`/api/cards/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  deleteCard: (id: string) => request<{ ok: boolean }>(`/api/cards/${id}`, { method: 'DELETE' }),

  /** Charges the subscription bound to a card. Omit amount to charge the plan's own price. */
  charge: (subscriptionId: string, amount?: number) =>
    request<{ approved: boolean; transaction: Transaction; card: VirtualCard; subscription: Subscription }>(
      `/api/subscriptions/${subscriptionId}/charge`,
      { method: 'POST', body: JSON.stringify({ amount }) },
    ),
};

export const money = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const intervalLabel = (interval: string) =>
  interval === 'per_authorization' ? 'per purchase' : interval === 'monthly' ? 'per month' : `per ${interval}`;
