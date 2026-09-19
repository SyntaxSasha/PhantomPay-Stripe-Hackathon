export type Source = 'stripe' | 'simulated';
export type CardStatus = 'active' | 'paused' | 'deleted';
export type LimitInterval = 'per_authorization' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface VirtualCard {
  id: string;
  merchantName: string;
  stripeCardId: string | null;
  status: CardStatus;
  spendingLimit: { amount: number; interval: LimitInterval };
  expiresAt: string | null;
  merchantLocked: boolean;
  last4: string;
  expMonth: number;
  expYear: number;
  brand: string;
  spentThisPeriod: number;
  createdAt: string;
  source: Source;
}

export interface Transaction {
  id: string;
  cardId: string;
  merchantName: string;
  amount: number;
  status: 'approved' | 'declined';
  declineReason: string | null;
  createdAt: string;
  source: Source;
}

export interface CardSecret {
  number: string;
  cvc: string;
  expMonth: number;
  expYear: number;
  source: Source;
}

export interface Capabilities {
  mode: Source;
  hasKey: boolean;
  testMode: boolean;
  issuingEnabled: boolean;
  canCreateCards: boolean;
  canRevealDetails: boolean;
  canSimulateAuthorizations: boolean;
  merchantLockEnforcedBy: string;
  notes: string[];
}
