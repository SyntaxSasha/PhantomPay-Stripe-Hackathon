export type Source = 'stripe' | 'simulated';

export type CardStatus = 'active' | 'paused' | 'deleted';

export type CardType = 'Visa' | 'Mastercard' | 'Amex';

export type LimitInterval = 'per_authorization' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type BillingCycle = 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';

export interface SpendingLimit {
  /** Minor units (cents). */
  amount: number;
  interval: LimitInterval;
}

/**
 * A card belongs to a person, not to a merchant. It is minted in the
 * cardholder's name and carries no merchant rule until a subscription is
 * linked to it — that link is what turns it into a merchant-specific credential.
 */
export interface VirtualCard {
  id: string;
  cardHolder: string;
  cardType: CardType;
  isDefault: boolean;
  /** Null when this card was not issued by Stripe. */
  stripeCardId: string | null;
  status: CardStatus;
  /** The subscription this card is bound to, or null while it is unbound. */
  linkedSubscriptionId: string | null;
  /** The real card this one draws on. Null until a funding card is attached. */
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

/**
 * A card already in the user's wallet — the funding source a virtual card draws
 * on. We hold the last four and nothing else: the full number is exactly what
 * PhantomPay exists to avoid handing around.
 */
export interface PhysicalCard {
  id: string;
  cardHolder: string;
  cardType: CardType;
  lastFour: string;
  expMonth: number;
  expYear: number;
  issuer: string;
}

export interface Subscription {
  id: string;
  name: string;
  /** Minor units (cents). */
  price: number;
  billingCycle: BillingCycle;
  status: 'Active' | 'Cancelled';
  description: string;
  startDate: string;
  nextBillingDate: string;
  /** The card that pays this subscription, or null for the real card. */
  virtualCardId: string | null;
  createdAt: string;
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
  /** What actually backs the cards in this session. */
  mode: Source;
  hasKey: boolean;
  testMode: boolean;
  issuingEnabled: boolean;
  canCreateCards: boolean;
  /** Whether the full PAN + CVC can be read back from Stripe. */
  canRevealDetails: boolean;
  /** Whether test-mode authorizations can be driven through Stripe. */
  canSimulateAuthorizations: boolean;
  /** Per-merchant locking is enforced by us in the real-time auth webhook, not by Stripe rules. */
  merchantLockEnforcedBy: 'realtime-authorization-webhook' | 'simulated';
  notes: string[];
}

export type AlertType =
  | 'blocked_charge'
  | 'suspicious_transaction'
  | 'unusual_location'
  | 'multiple_attempts';

export type AlertSeverity = 'high' | 'medium' | 'low';

export interface FraudAlert {
  id: string;
  cardId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  date: string;
  status: 'active' | 'resolved';
  /** True when this came from a real decline rather than the demo scenario set. */
  derived: boolean;
}
