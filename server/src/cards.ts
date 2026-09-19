import { randomUUID } from 'node:crypto';
import { getCardholderId, stripe } from './stripe.js';
import { store } from './store.js';
import type {
  BillingCycle,
  CardSecret,
  CardType,
  Capabilities,
  SpendingLimit,
  Subscription,
  Transaction,
  VirtualCard,
} from './types.js';

export interface CreateCardInput {
  cardHolder: string;
  cardType: CardType;
  isDefault: boolean;
  /** The wallet card this one draws on. Optional — it can be attached later. */
  fundingCardId?: string | null;
}

/**
 * Stripe has no quarterly interval, so a quarterly plan becomes a yearly cap of
 * four charges. Every other cycle maps straight across. The cap always covers
 * exactly one billing period's worth of legitimate charges and no more.
 */
export function limitForCycle(price: number, cycle: BillingCycle): SpendingLimit {
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

/** Deterministic demo digits so a simulated card looks the same every time it is opened. */
function simulatedDigits(seed: string): { number: string; cvc: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const block = (n: number) => String((h >>> (n * 4)) % 10000).padStart(4, '0');
  return { number: `4242${block(1)}${block(2)}${block(3)}`, cvc: String((h % 900) + 100) };
}

export async function createCard(input: CreateCardInput, caps: Capabilities): Promise<VirtualCard> {
  const id = randomUUID();

  if (caps.mode === 'stripe' && stripe) {
    const cardholder = await getCardholderId(input.cardHolder);
    const created = await stripe.issuing.cards.create({
      cardholder,
      currency: 'usd',
      type: 'virtual',
      status: 'active',
      metadata: {
        phantom_id: id,
        phantom_card_holder: input.cardHolder,
        phantom_requested_type: input.cardType,
      },
    });

    const card = store.addCard({
      id,
      cardHolder: input.cardHolder,
      cardType: input.cardType,
      isDefault: input.isDefault,
      stripeCardId: created.id,
      status: 'active',
      linkedSubscriptionId: null,
      fundingCardId: input.fundingCardId ?? null,
      spendingLimit: null,
      last4: created.last4,
      expMonth: created.exp_month,
      expYear: created.exp_year,
      // What Stripe actually issued, which may not be the type that was asked for.
      brand: created.brand,
      spentThisPeriod: 0,
      createdAt: new Date().toISOString(),
      source: 'stripe',
    });
    if (input.isDefault) store.clearDefaultExcept(id);
    return card;
  }

  const digits = simulatedDigits(id);
  const now = new Date();
  const card = store.addCard({
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
    source: 'simulated',
  });
  if (input.isDefault) store.clearDefaultExcept(id);
  return card;
}

/**
 * Binding a card to a subscription is what makes it merchant-specific. Until this
 * runs the card has no merchant and no limit, and `evaluate` refuses everything.
 */
export async function linkCard(
  card: VirtualCard,
  subscription: Subscription,
): Promise<VirtualCard> {
  const limit = limitForCycle(subscription.price, subscription.billingCycle);

  if (card.stripeCardId && stripe) {
    await stripe.issuing.cards.update(card.stripeCardId, {
      spending_controls: { spending_limits: [limit] },
      metadata: {
        phantom_id: card.id,
        phantom_subscription: subscription.name,
        phantom_subscription_id: subscription.id,
      },
    });
  }

  // A card pays for one subscription only.
  store.unlinkCardEverywhere(card.id);
  if (card.linkedSubscriptionId && card.linkedSubscriptionId !== subscription.id) {
    store.updateSubscription(card.linkedSubscriptionId, { virtualCardId: null });
  }

  store.updateSubscription(subscription.id, { virtualCardId: card.id });
  return store.updateCard(card.id, {
    linkedSubscriptionId: subscription.id,
    spendingLimit: limit,
    spentThisPeriod: 0,
  })!;
}

export async function unlinkCard(card: VirtualCard): Promise<VirtualCard> {
  if (card.stripeCardId && stripe) {
    await stripe.issuing.cards.update(card.stripeCardId, {
      spending_controls: { spending_limits: [] },
    });
  }
  if (card.linkedSubscriptionId) {
    store.updateSubscription(card.linkedSubscriptionId, { virtualCardId: null });
  }
  return store.updateCard(card.id, { linkedSubscriptionId: null, spendingLimit: null })!;
}

export async function revealCard(card: VirtualCard, caps: Capabilities): Promise<CardSecret> {
  if (card.source === 'stripe' && card.stripeCardId && stripe && caps.canRevealDetails) {
    const full = await stripe.issuing.cards.retrieve(card.stripeCardId, {
      expand: ['number', 'cvc'],
    });
    return {
      number: full.number ?? '',
      cvc: full.cvc ?? '',
      expMonth: full.exp_month,
      expYear: full.exp_year,
      source: 'stripe',
    };
  }

  const digits = simulatedDigits(card.id);
  return {
    number: digits.number,
    cvc: digits.cvc,
    expMonth: card.expMonth,
    expYear: card.expYear,
    source: 'simulated',
  };
}

export async function setCardStatus(
  card: VirtualCard,
  status: 'active' | 'paused' | 'deleted',
): Promise<VirtualCard> {
  if (card.stripeCardId && stripe) {
    const stripeStatus = status === 'active' ? 'active' : status === 'paused' ? 'inactive' : 'canceled';
    await stripe.issuing.cards.update(card.stripeCardId, { status: stripeStatus });
  }
  if (status === 'deleted') store.unlinkCardEverywhere(card.id);
  return store.updateCard(card.id, { status })!;
}

export interface ChargeResult {
  approved: boolean;
  transaction: Transaction;
}

/**
 * The single place a purchase is judged. In production this same rule set runs inside
 * Stripe's real-time authorization webhook; here it also gates the test-mode authorization
 * we ask Stripe to create.
 */
export function evaluate(card: VirtualCard, subscriptionId: string, amount: number): string | null {
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

export async function charge(
  card: VirtualCard,
  subscription: Subscription,
  amount: number,
  caps: Capabilities,
): Promise<ChargeResult> {
  const declineReason = evaluate(card, subscription.id, amount);
  const base = {
    id: randomUUID(),
    cardId: card.id,
    merchantName: subscription.name,
    amount,
    createdAt: new Date().toISOString(),
  };

  if (declineReason) {
    const tx = store.addTransaction({
      ...base,
      status: 'declined',
      declineReason,
      source: card.source,
    });
    return { approved: false, transaction: tx };
  }

  let source = card.source;

  if (card.source === 'stripe' && card.stripeCardId && stripe && caps.canSimulateAuthorizations) {
    const auth = await stripe.testHelpers.issuing.authorizations.create({
      card: card.stripeCardId,
      amount,
      currency: 'usd',
      merchant_data: { name: subscription.name, category: 'digital_goods_media', country: 'US' },
    });

    if (auth.status === 'closed' || auth.approved === false) {
      const reason = auth.request_history?.[0]?.reason ?? 'declined_by_stripe';
      const tx = store.addTransaction({
        ...base,
        status: 'declined',
        declineReason: `Stripe declined: ${reason}`,
        source: 'stripe',
      });
      return { approved: false, transaction: tx };
    }

    await stripe.testHelpers.issuing.authorizations.capture(auth.id);
    source = 'stripe';
  }

  store.updateCard(card.id, { spentThisPeriod: card.spentThisPeriod + amount });

  const tx = store.addTransaction({ ...base, status: 'approved', declineReason: null, source });
  return { approved: true, transaction: tx };
}
