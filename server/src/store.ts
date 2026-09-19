import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  FraudAlert,
  PhysicalCard,
  Subscription,
  Transaction,
  VirtualCard,
} from './types.js';

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, '../data/db.json');

interface Db {
  cards: VirtualCard[];
  physicalCards: PhysicalCard[];
  subscriptions: Subscription[];
  transactions: Transaction[];
  alerts: FraudAlert[];
}

/**
 * The wallet the demo starts with. These stand in for cards the user already
 * holds, so there is something to fund a virtual card from on a cold start.
 */
function defaultWallet(): PhysicalCard[] {
  return [
    {
      id: 'pc_visa_4242',
      cardHolder: 'Sasha Zhukovsky',
      cardType: 'Visa',
      lastFour: '4242',
      expMonth: 12,
      expYear: 2028,
      issuer: 'Personal',
    },
    {
      id: 'pc_mc_1234',
      cardHolder: 'Sasha Zhukovsky',
      cardType: 'Mastercard',
      lastFour: '1234',
      expMonth: 9,
      expYear: 2027,
      issuer: 'Rewards',
    },
  ];
}

const EMPTY: Db = {
  cards: [],
  physicalCards: [],
  subscriptions: [],
  transactions: [],
  alerts: [],
};

function load(): Db {
  if (!existsSync(file)) return { ...EMPTY, physicalCards: defaultWallet() };
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<Db>;
    // Older files predate subscriptions and funding cards; fill the gaps rather
    // than crashing, and normalise absent fields to null instead of undefined.
    return {
      cards: (parsed.cards ?? []).map((c) => ({ ...c, fundingCardId: c.fundingCardId ?? null })),
      subscriptions: parsed.subscriptions ?? [],
      transactions: parsed.transactions ?? [],
      alerts: parsed.alerts ?? [],
      physicalCards:
        parsed.physicalCards && parsed.physicalCards.length > 0
          ? parsed.physicalCards
          : defaultWallet(),
    };
  } catch {
    return { ...EMPTY, physicalCards: defaultWallet() };
  }
}

const db = load();

function persist() {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(db, null, 2));
}

export const store = {
  cards(): VirtualCard[] {
    return db.cards.filter((c) => c.status !== 'deleted');
  },
  card(id: string): VirtualCard | undefined {
    return db.cards.find((c) => c.id === id);
  },
  cardByStripeId(stripeCardId: string): VirtualCard | undefined {
    return db.cards.find((c) => c.stripeCardId === stripeCardId);
  },
  addCard(card: VirtualCard): VirtualCard {
    db.cards.unshift(card);
    persist();
    return card;
  },
  updateCard(id: string, patch: Partial<VirtualCard>): VirtualCard | undefined {
    const card = db.cards.find((c) => c.id === id);
    if (!card) return undefined;
    Object.assign(card, patch);
    persist();
    return card;
  },
  /** Exactly one card carries the default flag. */
  clearDefaultExcept(id: string) {
    for (const c of db.cards) c.isDefault = c.id === id;
    persist();
  },

  subscriptions(): Subscription[] {
    return db.subscriptions;
  },
  subscription(id: string): Subscription | undefined {
    return db.subscriptions.find((s) => s.id === id);
  },
  subscriptionByCard(cardId: string): Subscription | undefined {
    return db.subscriptions.find((s) => s.virtualCardId === cardId);
  },
  addSubscription(sub: Subscription): Subscription {
    db.subscriptions.unshift(sub);
    persist();
    return sub;
  },
  updateSubscription(id: string, patch: Partial<Subscription>): Subscription | undefined {
    const sub = db.subscriptions.find((s) => s.id === id);
    if (!sub) return undefined;
    Object.assign(sub, patch);
    persist();
    return sub;
  },
  removeSubscription(id: string) {
    db.subscriptions = db.subscriptions.filter((s) => s.id !== id);
    persist();
  },
  /** A card can pay for only one subscription, so binding one unbinds the rest. */
  unlinkCardEverywhere(cardId: string) {
    for (const s of db.subscriptions) {
      if (s.virtualCardId === cardId) s.virtualCardId = null;
    }
    persist();
  },

  transactions(cardId?: string): Transaction[] {
    return cardId ? db.transactions.filter((t) => t.cardId === cardId) : db.transactions;
  },
  addTransaction(tx: Transaction): Transaction {
    db.transactions.unshift(tx);
    persist();
    return tx;
  },

  physicalCards(): PhysicalCard[] {
    return db.physicalCards;
  },
  physicalCard(id: string): PhysicalCard | undefined {
    return db.physicalCards.find((p) => p.id === id);
  },
  addPhysicalCard(card: PhysicalCard): PhysicalCard {
    db.physicalCards.unshift(card);
    persist();
    return card;
  },
  removePhysicalCard(id: string) {
    db.physicalCards = db.physicalCards.filter((p) => p.id !== id);
    // Anything funded by it falls back to unfunded rather than dangling.
    for (const c of db.cards) if (c.fundingCardId === id) c.fundingCardId = null;
    persist();
  },

  alerts(): FraudAlert[] {
    return db.alerts;
  },
  addAlert(alert: FraudAlert): FraudAlert {
    db.alerts.push(alert);
    persist();
    return alert;
  },
  /**
   * Derived alerts have no stored row, so resolving one writes a stub carrying
   * just the id and the resolved status.
   */
  resolveAlert(id: string, alert?: FraudAlert): void {
    const found = db.alerts.find((a) => a.id === id);
    if (found) {
      found.status = 'resolved';
    } else if (alert) {
      db.alerts.push({ ...alert, status: 'resolved' });
    }
    persist();
  },

  reset() {
    db.cards = [];
    db.subscriptions = [];
    db.transactions = [];
    db.alerts = [];
    // The wallet survives a reset — it represents cards the user actually holds.
    db.physicalCards = defaultWallet();
    persist();
  },
};
