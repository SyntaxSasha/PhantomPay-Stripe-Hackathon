/** Mirrors server/src/types.ts. All money is minor units (cents). */

export type Source = 'stripe' | 'simulated';
export type CardStatus = 'active' | 'paused' | 'deleted';
export type CardType = 'Visa' | 'Mastercard' | 'Amex';
export type LimitInterval = 'per_authorization' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type BillingCycle = 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';

export interface SpendingLimit {
  amount: number;
  interval: LimitInterval;
}

export interface VirtualCard {
  id: string;
  cardHolder: string;
  cardType: CardType;
  isDefault: boolean;
  stripeCardId: string | null;
  status: CardStatus;
  linkedSubscriptionId: string | null;
  /** The real card this one draws on. Null until a funding card is attached. */
  fundingCardId: string | null;
  spendingLimit: SpendingLimit | null;
  last4: string;
  expMonth: number;
  expYear: number;
  brand: string;
  spentThisPeriod: number;
  createdAt: string;
  source: Source;
}

/** A card already in the wallet. We hold the last four and nothing else. */
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
  price: number;
  billingCycle: BillingCycle;
  status: 'Active' | 'Cancelled';
  description: string;
  startDate: string;
  nextBillingDate: string;
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
  mode: Source;
  hasKey: boolean;
  testMode: boolean;
  issuingEnabled: boolean;
  canCreateCards: boolean;
  canRevealDetails: boolean;
  canSimulateAuthorizations: boolean;
  merchantLockEnforcedBy: 'realtime-authorization-webhook' | 'simulated';
  notes: string[];
}

export interface ChargeResult {
  approved: boolean;
  transaction: Transaction;
  card: VirtualCard;
  subscription: Subscription;
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
  /** True when this came from a real decline rather than the scenario set. */
  derived: boolean;
}

export interface AppState {
  cards: VirtualCard[];
  physicalCards: PhysicalCard[];
  subscriptions: Subscription[];
  transactions: Transaction[];
  alerts: FraudAlert[];
  capabilities: Capabilities;
}
