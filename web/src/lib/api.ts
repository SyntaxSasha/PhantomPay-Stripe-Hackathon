import * as db from './localdb';
import type { AppState, BillingCycle, CardType, ChargeResult } from '../types';

export const storageNotice = () => db.storageNotice();

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

/**
 * PhantomPay runs entirely in this browser — there is no server. Every call
 * below reads or writes localStorage synchronously; the `async` wrapper only
 * keeps the same Promise-based interface the rest of the app already expects.
 */
export const api = {
  state: async (): Promise<AppState> => db.state(),

  createCard: async (input: CreateCardInput) => ({ card: db.createCard(input) }),

  reveal: async (id: string) => {
    const card = db.readCard(id);
    if (!card) throw new Error('No such card');
    if (card.status === 'deleted') throw new Error('Card deleted');
    return { secret: db.revealCard(card) };
  },

  setCardStatus: async (id: string, status: 'active' | 'paused') => {
    const card = db.readCard(id);
    if (!card) throw new Error('No such card');
    return { card: db.setCardStatus(card, status) };
  },

  makeDefault: async (id: string) => {
    const card = db.readCard(id);
    if (!card) throw new Error('No such card');
    return { cards: db.makeDefault(card) };
  },

  deleteCard: async (id: string) => {
    const card = db.readCard(id);
    if (!card) throw new Error('No such card');
    return { ok: true as const, ...db.deleteCard(card) };
  },

  createSubscription: async (input: CreateSubscriptionInput) => ({
    subscription: db.createSubscription(input),
  }),

  deleteSubscription: async (id: string) => {
    const sub = db.readSubscription(id);
    if (!sub) throw new Error('No such subscription');
    db.deleteSubscription(sub);
    return { ok: true as const };
  },

  /** cardId null unbinds whatever is currently attached. */
  link: async (subscriptionId: string, cardId: string | null) => {
    const sub = db.readSubscription(subscriptionId);
    if (!sub) throw new Error('No such subscription');

    if (cardId === null) return db.unlinkCard(subscriptionId);

    const card = db.readCard(cardId);
    if (!card) throw new Error('No such card');
    if (card.status === 'deleted') throw new Error('Card deleted');
    return db.linkCard(card, sub);
  },

  charge: async (subscriptionId: string, amount?: number): Promise<ChargeResult> => {
    const sub = db.readSubscription(subscriptionId);
    if (!sub) throw new Error('No such subscription');
    return db.charge(sub, amount);
  },

  /** physicalCardId null detaches the funding source. */
  setFunding: async (cardId: string, physicalCardId: string | null) => {
    const card = db.readCard(cardId);
    if (!card) throw new Error('No such card');
    return { card: db.setFunding(card, physicalCardId) };
  },

  addPhysicalCard: async (input: AddPhysicalCardInput) => ({
    physicalCard: db.addPhysicalCard(input),
  }),

  removePhysicalCard: async (id: string) => ({ ok: true as const, ...db.removePhysicalCard(id) }),

  alerts: async () => ({ alerts: db.listAlerts() }),

  resolveAlert: async (id: string) => ({ alerts: db.resolveAlert(id) }),

  reset: async () => {
    db.reset();
    return { ok: true as const };
  },
};
