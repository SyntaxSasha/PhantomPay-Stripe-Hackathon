/**
 * The whole "Phantom API" ported to run in the browser — no server, no Stripe
 * key. Cards are locally generated rather than Stripe-issued, and state lives
 * in localStorage instead of Postgres. Mirrors server/src/{store,cards,alerts}.ts
 * closely enough that porting a fix back and forth should stay easy.
 */
import type {
  AlertSeverity,
  AlertType,
  BillingCycle,
  Capabilities,
  CardSecret,
  CardType,
  FraudAlert,
  PhysicalCard,
  Source,
  SpendingLimit,
  Subscription,
  Transaction,
  VirtualCard,
} from '../types';

const KEY = 'phantompay-poc-v1';

interface Db {
  cards: VirtualCard[];
  physicalCards: PhysicalCard[];
  subscriptions: Subscription[];
  transactions: Transaction[];
  alerts: FraudAlert[];
}

export const capabilities: Capabilities = {
  mode: 'simulated',
  hasKey: false,
  testMode: true,
  issuingEnabled: false,
  canCreateCards: true,
  canRevealDetails: true,
  canSimulateAuthorizations: true,
  merchantLockEnforcedBy: 'simulated',
  notes: [
    'Running fully client-side in this browser — no server, no Stripe key. Cards are locally generated, not Stripe-issued.',
  ],
};

const fail = (message: string): never => {
  throw new Error(message);
};

/** These stand in for cards the user already holds, so there is something to fund a virtual card from. */
function defaultWallet(): PhysicalCard[] {
  return [
    {
      id: 'pc_visa_4242',
      cardHolder: 'You',
      cardType: 'Visa',
      lastFour: '4242',
      expMonth: 12,
      expYear: 2028,
      issuer: 'Personal',
    },
    {
      id: 'pc_mc_1234',
      cardHolder: 'You',
      cardType: 'Mastercard',
      lastFour: '1234',
      expMonth: 9,
      expYear: 2027,
      issuer: 'Rewards',
    },
  ];
}

/** Deterministic demo digits so a card looks the same every time it is reopened. */
function simulatedDigits(seed: string): { number: string; cvc: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const block = (n: number) => String((h >>> (n * 4)) % 10000).padStart(4, '0');
  return { number: `4242${block(1)}${block(2)}${block(3)}`, cvc: String((h % 900) + 100) };
}

/**
 * Stripe has no quarterly interval, so a quarterly plan becomes a yearly cap of
 * four charges. Every other cycle maps straight across.
 */
function limitForCycle(price: number, cycle: BillingCycle): SpendingLimit {
  switch (cycle) {
    case 'Weekly':
      return { amount: price, interval: 'weekly' };
    case 'Quarterly':
      return { amount: price * 4, interval: 'yearly' };
    case 'Yearly':
      return { amount: price, interval: 'yearly' };
    case 'Monthly':
    default:
      return { amount: price, interval: 'monthly' };
  }
}

function nextBillingDate(start: string, cycle: BillingCycle): string {
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) d.setTime(Date.now());
  switch (cycle) {
    case 'Weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'Quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'Yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}

function newCard(input: {
  cardHolder: string;
  cardType: CardType;
  isDefault: boolean;
  fundingCardId?: string | null;
}): VirtualCard {
  const id = crypto.randomUUID();
  const digits = simulatedDigits(id);
  const now = new Date();
  const source: Source = 'simulated';
  return {
    id,
    cardHolder: input.cardHolder,
    cardType: input.cardType,
    isDefault: input.isDefault,
    stripeCardId: null,
    status: 'active',
    linkedSubscriptionId: null,
    fundingCardId: input.fundingCardId ?? null,
    spendingLimit: null,
    last4: digits.number.slice(-4),
    expMonth: ((now.getMonth() + 5) % 12) + 1,
    expYear: now.getFullYear() + 4,
    brand: input.cardType,
    spentThisPeriod: 0,
    createdAt: now.toISOString(),
    source,
  };
}

/** Two demo cards, each already linked to a subscription, so the app is never empty on first open. */
function seedDemo(): Pick<Db, 'cards' | 'subscriptions' | 'transactions'> {
  const now = new Date();
  const start = now.toISOString().slice(0, 10);

  const netflixCard: VirtualCard = { ...newCard({ cardHolder: 'You', cardType: 'Visa', isDefault: true, fundingCardId: 'pc_visa_4242' }) };
  const netflixSub: Subscription = {
    id: crypto.randomUUID(),
    name: 'Netflix',
    price: 1499,
    billingCycle: 'Monthly',
    status: 'Active',
    description: 'Streaming service for movies and TV shows',
    startDate: start,
    nextBillingDate: nextBillingDate(start, 'Monthly'),
    virtualCardId: netflixCard.id,
    createdAt: now.toISOString(),
  };
  netflixCard.linkedSubscriptionId = netflixSub.id;
  netflixCard.spendingLimit = limitForCycle(netflixSub.price, netflixSub.billingCycle);
  // Already spent this period's charge, so a second demo charge declines immediately.
  netflixCard.spentThisPeriod = netflixSub.price;

  const netflixTx: Transaction = {
    id: crypto.randomUUID(),
    cardId: netflixCard.id,
    merchantName: netflixSub.name,
    amount: netflixSub.price,
    status: 'approved',
    declineReason: null,
    createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    source: 'simulated',
  };

  const spotifyCard = newCard({ cardHolder: 'You', cardType: 'Mastercard', isDefault: false });
  const spotifySub: Subscription = {
    id: crypto.randomUUID(),
    name: 'Spotify',
    price: 1199,
    billingCycle: 'Monthly',
    status: 'Active',
    description: 'Music streaming',
    startDate: start,
    nextBillingDate: nextBillingDate(start, 'Monthly'),
    virtualCardId: spotifyCard.id,
    createdAt: now.toISOString(),
  };
  spotifyCard.linkedSubscriptionId = spotifySub.id;
  spotifyCard.spendingLimit = limitForCycle(spotifySub.price, spotifySub.billingCycle);

  return {
    cards: [spotifyCard, netflixCard],
    subscriptions: [spotifySub, netflixSub],
    transactions: [netflixTx],
  };
}

function freshDb(): Db {
  return { physicalCards: defaultWallet(), alerts: [], ...seedDemo() };
}

let storageError = '';
export const storageNotice = () => storageError;

function hydrate(parsed: Partial<Db>): Db {
  return {
    cards: (parsed.cards ?? []).map((c) => ({ ...c, fundingCardId: c.fundingCardId ?? null })),
    subscriptions: parsed.subscriptions ?? [],
    transactions: parsed.transactions ?? [],
    alerts: parsed.alerts ?? [],
    physicalCards:
      parsed.physicalCards && parsed.physicalCards.length > 0 ? parsed.physicalCards : defaultWallet(),
  };
}

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshDb();
    return hydrate(JSON.parse(raw));
  } catch {
    storageError = 'Saved demo data could not be loaded. A fresh demo is running in this tab.';
    return freshDb();
  }
}

const db = load();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    storageError = 'Browser storage is unavailable. Changes last for this tab only.';
  }
}

/* ----------------------------------------------------------------- store */

const store = {
  cards: () => db.cards.filter((c) => c.status !== 'deleted'),
  card: (id: string) => db.cards.find((c) => c.id === id),
  addCard(card: VirtualCard) {
    db.cards.unshift(card);
    persist();
    return card;
  },
  updateCard(id: string, patch: Partial<VirtualCard>) {
    const card = db.cards.find((c) => c.id === id);
    if (!card) return undefined;
    Object.assign(card, patch);
    persist();
    return card;
  },
  clearDefaultExcept(id: string) {
    for (const c of db.cards) c.isDefault = c.id === id;
    persist();
  },

  subscriptions: () => db.subscriptions,
  subscription: (id: string) => db.subscriptions.find((s) => s.id === id),
  addSubscription(sub: Subscription) {
    db.subscriptions.unshift(sub);
    persist();
    return sub;
  },
  updateSubscription(id: string, patch: Partial<Subscription>) {
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
  unlinkCardEverywhere(cardId: string) {
    for (const s of db.subscriptions) if (s.virtualCardId === cardId) s.virtualCardId = null;
    persist();
  },

  transactions: (cardId?: string) => (cardId ? db.transactions.filter((t) => t.cardId === cardId) : db.transactions),
  addTransaction(tx: Transaction) {
    db.transactions.unshift(tx);
    persist();
    return tx;
  },

  physicalCards: () => db.physicalCards,
  physicalCard: (id: string) => db.physicalCards.find((p) => p.id === id),
  addPhysicalCard(card: PhysicalCard) {
    db.physicalCards.unshift(card);
    persist();
    return card;
  },
  removePhysicalCard(id: string) {
    db.physicalCards = db.physicalCards.filter((p) => p.id !== id);
    for (const c of db.cards) if (c.fundingCardId === id) c.fundingCardId = null;
    persist();
  },

  alerts: () => db.alerts,
  addAlert(alert: FraudAlert) {
    db.alerts.push(alert);
    persist();
    return alert;
  },
  resolveAlert(id: string, alert?: FraudAlert) {
    const found = db.alerts.find((a) => a.id === id);
    if (found) found.status = 'resolved';
    else if (alert) db.alerts.push({ ...alert, status: 'resolved' });
    persist();
  },

  reset() {
    Object.assign(db, freshDb());
    persist();
  },
};

/* ------------------------------------------------------------------ cards */

export function createCard(input: {
  cardHolder: string;
  cardType: CardType;
  isDefault: boolean;
  fundingCardId?: string | null;
}): VirtualCard {
  const card = store.addCard(
    newCard({ ...input, fundingCardId: store.physicalCard(input.fundingCardId ?? '')?.id ?? null }),
  );
  if (input.isDefault) store.clearDefaultExcept(card.id);
  return card;
}

export function revealCard(card: VirtualCard): CardSecret {
  const digits = simulatedDigits(card.id);
  return { number: digits.number, cvc: digits.cvc, expMonth: card.expMonth, expYear: card.expYear, source: 'simulated' };
}

export function setCardStatus(card: VirtualCard, status: 'active' | 'paused' | 'deleted'): VirtualCard {
  if (status === 'deleted') store.unlinkCardEverywhere(card.id);
  return store.updateCard(card.id, { status })!;
}

export function makeDefault(card: VirtualCard): VirtualCard[] {
  store.clearDefaultExcept(card.id);
  return store.cards();
}

export function setFunding(card: VirtualCard, physicalCardId: string | null): VirtualCard {
  if (physicalCardId !== null && !store.physicalCard(physicalCardId)) fail('No such physical card');
  return store.updateCard(card.id, { fundingCardId: physicalCardId })!;
}

export function deleteCard(card: VirtualCard): { subscriptions: Subscription[] } {
  setCardStatus(card, 'deleted');
  return { subscriptions: store.subscriptions() };
}

/**
 * Binding a card to a subscription is what makes it merchant-specific. Until
 * this runs the card has no merchant and no limit, and `evaluate` refuses
 * everything.
 */
export function linkCard(card: VirtualCard, subscription: Subscription): { subscription: Subscription; cards: VirtualCard[] } {
  const limit = limitForCycle(subscription.price, subscription.billingCycle);

  store.unlinkCardEverywhere(card.id);
  if (card.linkedSubscriptionId && card.linkedSubscriptionId !== subscription.id) {
    store.updateSubscription(card.linkedSubscriptionId, { virtualCardId: null });
  }

  store.updateSubscription(subscription.id, { virtualCardId: card.id });
  store.updateCard(card.id, { linkedSubscriptionId: subscription.id, spendingLimit: limit, spentThisPeriod: 0 });

  return { subscription: store.subscription(subscription.id)!, cards: store.cards() };
}

export function unlinkCard(subscriptionId: string): { subscription: Subscription; cards: VirtualCard[] } {
  const sub = store.subscription(subscriptionId)!;
  if (sub.virtualCardId) {
    store.updateCard(sub.virtualCardId, { linkedSubscriptionId: null, spendingLimit: null });
  }
  store.updateSubscription(sub.id, { virtualCardId: null });
  return { subscription: store.subscription(sub.id)!, cards: store.cards() };
}

/* ---------------------------------------------------------- subscriptions */

const CYCLES: BillingCycle[] = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];

export function createSubscription(input: {
  name: string;
  price: number;
  billingCycle: BillingCycle;
  description: string;
  startDate: string;
}): Subscription {
  if (!input.name.trim()) fail('name is required');
  if (!(input.price > 0)) fail('price must be a positive number of cents');
  const cycle = CYCLES.includes(input.billingCycle) ? input.billingCycle : 'Monthly';
  const start = input.startDate || new Date().toISOString().slice(0, 10);

  return store.addSubscription({
    id: crypto.randomUUID(),
    name: input.name.trim(),
    price: Math.round(input.price),
    billingCycle: cycle,
    status: 'Active',
    description: input.description ?? '',
    startDate: start,
    nextBillingDate: nextBillingDate(start, cycle),
    virtualCardId: null,
    createdAt: new Date().toISOString(),
  });
}

export function deleteSubscription(sub: Subscription): void {
  if (sub.virtualCardId) store.updateCard(sub.virtualCardId, { linkedSubscriptionId: null, spendingLimit: null });
  store.removeSubscription(sub.id);
}

/** The single place a purchase is judged. */
function evaluate(card: VirtualCard, subscriptionId: string, amount: number): string | null {
  if (card.status === 'deleted') return 'Card deleted — this credential no longer exists';
  if (card.status === 'paused') return 'Card paused by the cardholder';
  if (!card.linkedSubscriptionId || !card.spendingLimit) {
    return 'Card is not linked to a subscription — nothing may charge it';
  }
  if (card.linkedSubscriptionId !== subscriptionId) {
    const bound = store.subscription(card.linkedSubscriptionId);
    return `Locked to ${bound?.name ?? 'another subscription'} — this merchant is not authorised`;
  }
  if (card.spentThisPeriod + amount > card.spendingLimit.amount) {
    return 'Spending limit exceeded for this period';
  }
  return null;
}

export function charge(
  subscription: Subscription,
  amount?: number,
): { approved: boolean; transaction: Transaction; card: VirtualCard; subscription: Subscription } {
  if (!subscription.virtualCardId) fail('No Phantom card is linked to this subscription');
  const card = store.card(subscription.virtualCardId!);
  if (!card) fail('The linked card no longer exists');

  const amt = typeof amount === 'number' ? Math.round(amount) : subscription.price;
  const declineReason = evaluate(card!, subscription.id, amt);
  const base = {
    id: crypto.randomUUID(),
    cardId: card!.id,
    merchantName: subscription.name,
    amount: amt,
    createdAt: new Date().toISOString(),
  };

  if (declineReason) {
    const tx = store.addTransaction({ ...base, status: 'declined', declineReason, source: card!.source });
    return { approved: false, transaction: tx, card: store.card(card!.id)!, subscription };
  }

  store.updateCard(card!.id, { spentThisPeriod: card!.spentThisPeriod + amt });
  const tx = store.addTransaction({ ...base, status: 'approved', declineReason: null, source: card!.source });
  return { approved: true, transaction: tx, card: store.card(card!.id)!, subscription };
}

/* --------------------------------------------------------- physical cards */

export function addPhysicalCard(input: {
  cardHolder: string;
  cardType: CardType;
  lastFour: string;
  issuer: string;
}): PhysicalCard {
  if (!input.cardHolder.trim()) fail('cardHolder is required');
  if (!/^\d{4}$/.test(input.lastFour)) fail('lastFour must be four digits');
  const now = new Date();
  return store.addPhysicalCard({
    id: crypto.randomUUID(),
    cardHolder: input.cardHolder.trim(),
    cardType: input.cardType,
    lastFour: input.lastFour,
    expMonth: now.getMonth() + 1,
    expYear: now.getFullYear() + 3,
    issuer: input.issuer.trim() || 'Personal',
  });
}

export function removePhysicalCard(id: string): { cards: VirtualCard[] } {
  if (!store.physicalCard(id)) fail('No such physical card');
  store.removePhysicalCard(id);
  return { cards: store.cards() };
}

/* --------------------------------------------------------------- alerts */

interface Scenario {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  describe: (card: VirtualCard, merchant: string) => string;
  agoMinutes: number;
}

const SCENARIOS: Scenario[] = [
  {
    type: 'multiple_attempts',
    severity: 'high',
    title: 'Repeated charge attempts blocked',
    describe: (card) =>
      `Four attempts to charge $99.99 to the card ending ${card.last4} within two minutes. All four were refused — the amount is over this card's limit.`,
    agoMinutes: 18,
  },
  {
    type: 'unusual_location',
    severity: 'medium',
    title: 'Charge attempted from an unexpected region',
    describe: (card, merchant) =>
      `A terminal in Singapore presented the card ending ${card.last4}. ${merchant} bills from the US, so the attempt was refused.`,
    agoMinutes: 96,
  },
  {
    type: 'suspicious_transaction',
    severity: 'medium',
    title: 'Merchant mismatch',
    describe: (card, merchant) =>
      `An unrecognised merchant tried to charge the card ending ${card.last4}. This card only authorises ${merchant}.`,
    agoMinutes: 420,
  },
];

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

function seedAlertsFor(card: VirtualCard): FraudAlert[] {
  const merchant = card.linkedSubscriptionId
    ? (store.subscription(card.linkedSubscriptionId)?.name ?? 'the linked merchant')
    : 'the linked merchant';

  return SCENARIOS.map((s) => ({
    id: crypto.randomUUID(),
    cardId: card.id,
    type: s.type,
    severity: s.severity,
    title: s.title,
    description: s.describe(card, merchant),
    date: minutesAgo(s.agoMinutes),
    status: 'active' as const,
    derived: false,
  }));
}

function derivedAlerts(): FraudAlert[] {
  return store
    .transactions()
    .filter((t) => t.status === 'declined')
    .map((t) => ({
      id: `tx-${t.id}`,
      cardId: t.cardId,
      type: 'blocked_charge' as const,
      severity: 'high' as const,
      title: `Charge to ${t.merchantName} refused`,
      description: `${t.merchantName} tried to take $${(t.amount / 100).toFixed(2)}. ${t.declineReason}.`,
      date: t.createdAt,
      status: 'active' as const,
      derived: true,
    }));
}

export function listAlerts(): FraudAlert[] {
  const cards = store.cards();

  for (const card of cards) {
    if (!store.alerts().some((a) => a.cardId === card.id && !a.derived)) {
      for (const alert of seedAlertsFor(card)) store.addAlert(alert);
    }
  }

  const resolved = new Set(store.alerts().filter((a) => a.status === 'resolved').map((a) => a.id));
  const stored = store.alerts().filter((a) => !a.id.startsWith('tx-') && cards.some((c) => c.id === a.cardId));
  const derived = derivedAlerts()
    .filter((a) => cards.some((c) => c.id === a.cardId))
    .map((a) => (resolved.has(a.id) ? { ...a, status: 'resolved' as const } : a));

  return [...derived, ...stored].sort((a, b) => b.date.localeCompare(a.date));
}

export function resolveAlert(id: string): FraudAlert[] {
  const alert = listAlerts().find((a) => a.id === id);
  if (!alert) fail('No such alert');
  store.resolveAlert(alert!.id, alert);
  return listAlerts();
}

/* --------------------------------------------------------------- reads */

export function readCard(id: string) {
  return store.card(id);
}
export function readSubscription(id: string) {
  return store.subscription(id);
}
export function state() {
  return {
    cards: store.cards(),
    physicalCards: store.physicalCards(),
    subscriptions: store.subscriptions(),
    transactions: store.transactions(),
    alerts: listAlerts(),
    capabilities,
  };
}
export function reset() {
  store.reset();
}
