export type Source = 'stripe' | 'simulated';
export type CardStatus = 'active' | 'paused' | 'deleted';
export type CardType = 'Visa' | 'Mastercard' | 'Amex';
export type LimitInterval = 'per_authorization' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type BillingCycle = 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';

export interface SpendingLimit {
  amount: number;
  interval: LimitInterval;
}

/**
 * A card belongs to a person, not to a merchant — it carries no merchant rule
 * until a subscription is linked to it. Mirrors server/src/types.ts.
 */
export interface VirtualCard {
  id: string;
  cardHolder: string;
  cardType: CardType;
  isDefault: boolean;
  stripeCardId: string | null;
  status: CardStatus;
  linkedSubscriptionId: string | null;
  fundingCardId: string | null;
  /** Mirrors the linked subscription's price. Null while unbound. */
  spendingLimit: SpendingLimit | null;
  last4: string;
  expMonth: number;
  expYear: number;
  brand: string;
  spentThisPeriod: number;
  createdAt: string;
  source: Source;
}

export interface Subscription {
  id: string;
  name: string;
  price: number;
  billingCycle: BillingCycle;
  status: 'Active' | 'Cancelled';
  description: string;
  startDate: string;
  nextBillingDate: string;
  virtualCardId: string | null;
  createdAt: string;
}

/**
 * A card merged with the subscription it is bound to — this app only ever shows
 * linked cards, so every screen renders this shape rather than a bare VirtualCard.
 */
export interface MerchantCard extends VirtualCard {
  spendingLimit: SpendingLimit;
  merchantName: string;
  billingCycle: BillingCycle;
  nextBillingDate: string;
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
