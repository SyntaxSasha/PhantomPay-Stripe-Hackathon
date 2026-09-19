import type {
  AppState,
  FraudAlert,
  PhysicalCard,
  BillingCycle,
  CardSecret,
  CardType,
  ChargeResult,
  Subscription,
  VirtualCard,
} from '../types';

/**
 * Vite proxies /api to the Phantom server (see vite.config.ts), so the app has a
 * single origin. Point VITE_API_URL at the server directly to bypass the proxy.
 */
const BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface CreateCardInput {
  cardHolder: string;
  cardType: CardType;
  isDefault: boolean;
  fundingCardId?: string | null;
}

export interface AddPhysicalCardInput {
  cardHolder: string;
  cardType: CardType;
  lastFour: string;
  issuer: string;
}

export interface CreateSubscriptionInput {
  name: string;
  price: number;
  billingCycle: BillingCycle;
  description: string;
  startDate: string;
}

export const api = {
  state: () => request<AppState>('/api/state'),

  createCard: (input: CreateCardInput) =>
    request<{ card: VirtualCard }>('/api/cards', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  reveal: (id: string) => request<{ secret: CardSecret }>(`/api/cards/${id}/secret`),

  setCardStatus: (id: string, status: 'active' | 'paused') =>
    request<{ card: VirtualCard }>(`/api/cards/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  makeDefault: (id: string) =>
    request<{ cards: VirtualCard[] }>(`/api/cards/${id}/default`, { method: 'POST' }),

  deleteCard: (id: string) => request<{ ok: true }>(`/api/cards/${id}`, { method: 'DELETE' }),

  createSubscription: (input: CreateSubscriptionInput) =>
    request<{ subscription: Subscription }>('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  deleteSubscription: (id: string) =>
    request<{ ok: true }>(`/api/subscriptions/${id}`, { method: 'DELETE' }),

  /** cardId null unbinds whatever is currently attached. */
  link: (subscriptionId: string, cardId: string | null) =>
    request<{ subscription: Subscription; cards: VirtualCard[] }>(
      `/api/subscriptions/${subscriptionId}/link`,
      { method: 'POST', body: JSON.stringify({ cardId }) },
    ),

  charge: (subscriptionId: string, amount?: number) =>
    request<ChargeResult>(`/api/subscriptions/${subscriptionId}/charge`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  /** physicalCardId null detaches the funding source. */
  setFunding: (cardId: string, physicalCardId: string | null) =>
    request<{ card: VirtualCard }>(`/api/cards/${cardId}/funding`, {
      method: 'POST',
      body: JSON.stringify({ physicalCardId }),
    }),

  addPhysicalCard: (input: AddPhysicalCardInput) =>
    request<{ physicalCard: PhysicalCard }>('/api/physical-cards', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  removePhysicalCard: (id: string) =>
    request<{ ok: true }>(`/api/physical-cards/${id}`, { method: 'DELETE' }),

  alerts: () => request<{ alerts: FraudAlert[] }>('/api/alerts'),

  resolveAlert: (id: string) =>
    request<{ alerts: FraudAlert[] }>(`/api/alerts/${id}/resolve`, { method: 'POST' }),

  reset: () => request<{ ok: true }>('/api/reset', { method: 'POST' }),
};
