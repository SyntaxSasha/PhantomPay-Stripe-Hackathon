import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { probeCapabilities, stripe } from './stripe.js';
import { store } from './store.js';
import { listAlerts } from './alerts.js';
import {
  charge,
  createCard,
  evaluate,
  linkCard,
  revealCard,
  setCardStatus,
  unlinkCard,
} from './cards.js';
import type { BillingCycle, Capabilities, CardType } from './types.js';

const app = express();
app.use(cors());
app.use(express.json());

let caps: Capabilities;

const asyncRoute =
  (fn: (req: express.Request, res: express.Response) => Promise<unknown>) =>
  (req: express.Request, res: express.Response) => {
    fn(req, res).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[phantom]', message);
      res.status(500).json({ error: message });
    });
  };

const CARD_TYPES: CardType[] = ['Visa', 'Mastercard', 'Amex'];
const CYCLES: BillingCycle[] = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];

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

app.get('/api/status', (_req, res) => {
  res.json({ capabilities: caps });
});

/** One call for the whole app state — the client renders off this. */
app.get('/api/state', (_req, res) => {
  res.json({
    cards: store.cards(),
    physicalCards: store.physicalCards(),
    subscriptions: store.subscriptions(),
    transactions: store.transactions(),
    alerts: listAlerts(),
    capabilities: caps,
  });
});

/* ---------------------------------------------------------------- cards */

app.get('/api/cards', (_req, res) => {
  res.json({ cards: store.cards(), capabilities: caps });
});

app.post(
  '/api/cards',
  asyncRoute(async (req, res) => {
    const { cardHolder, cardType, isDefault, fundingCardId } = req.body ?? {};

    if (typeof cardHolder !== 'string' || cardHolder.trim().length === 0) {
      return res.status(400).json({ error: 'cardHolder is required' });
    }
    const type: CardType = CARD_TYPES.includes(cardType) ? cardType : 'Visa';

    const card = await createCard(
      {
        cardHolder: cardHolder.trim(),
        cardType: type,
        isDefault: !!isDefault,
        fundingCardId: store.physicalCard(fundingCardId)?.id ?? null,
      },
      caps,
    );
    res.status(201).json({ card });
  }),
);

app.get('/api/cards/:id', (req, res) => {
  const card = store.card(req.params.id);
  if (!card) return res.status(404).json({ error: 'No such card' });
  res.json({ card, transactions: store.transactions(card.id) });
});

app.get(
  '/api/cards/:id/secret',
  asyncRoute(async (req, res) => {
    const card = store.card(req.params.id);
    if (!card) return res.status(404).json({ error: 'No such card' });
    if (card.status === 'deleted') return res.status(410).json({ error: 'Card deleted' });
    res.json({ secret: await revealCard(card, caps) });
  }),
);

app.post(
  '/api/cards/:id/status',
  asyncRoute(async (req, res) => {
    const card = store.card(req.params.id);
    if (!card) return res.status(404).json({ error: 'No such card' });
    const status = req.body?.status;
    if (status !== 'active' && status !== 'paused') {
      return res.status(400).json({ error: 'status must be active or paused' });
    }
    res.json({ card: await setCardStatus(card, status) });
  }),
);

app.post('/api/cards/:id/default', (req, res) => {
  const card = store.card(req.params.id);
  if (!card) return res.status(404).json({ error: 'No such card' });
  store.clearDefaultExcept(card.id);
  res.json({ cards: store.cards() });
});

app.delete(
  '/api/cards/:id',
  asyncRoute(async (req, res) => {
    const card = store.card(req.params.id);
    if (!card) return res.status(404).json({ error: 'No such card' });
    await setCardStatus(card, 'deleted');
    res.json({ ok: true, subscriptions: store.subscriptions() });
  }),
);

/**
 * Attach the real card a virtual card draws on. Pass physicalCardId: null to
 * detach. Nothing but the association is stored — we never hold the real number.
 */
app.post('/api/cards/:id/funding', (req, res) => {
  const card = store.card(req.params.id);
  if (!card) return res.status(404).json({ error: 'No such card' });

  const physicalCardId = req.body?.physicalCardId ?? null;
  if (physicalCardId !== null && !store.physicalCard(physicalCardId)) {
    return res.status(404).json({ error: 'No such physical card' });
  }

  res.json({ card: store.updateCard(card.id, { fundingCardId: physicalCardId }) });
});

/* ------------------------------------------------------ physical cards */

app.get('/api/physical-cards', (_req, res) => {
  res.json({ physicalCards: store.physicalCards() });
});

app.post('/api/physical-cards', (req, res) => {
  const { cardHolder, cardType, lastFour, issuer } = req.body ?? {};

  if (typeof cardHolder !== 'string' || cardHolder.trim().length === 0) {
    return res.status(400).json({ error: 'cardHolder is required' });
  }
  if (typeof lastFour !== 'string' || !/^\d{4}$/.test(lastFour)) {
    return res.status(400).json({ error: 'lastFour must be four digits' });
  }

  const now = new Date();
  const card = store.addPhysicalCard({
    id: randomUUID(),
    cardHolder: cardHolder.trim(),
    cardType: CARD_TYPES.includes(cardType) ? cardType : 'Visa',
    lastFour,
    expMonth: now.getMonth() + 1,
    expYear: now.getFullYear() + 3,
    issuer: typeof issuer === 'string' && issuer.trim() ? issuer.trim() : 'Personal',
  });

  res.status(201).json({ physicalCard: card });
});

app.delete('/api/physical-cards/:id', (req, res) => {
  if (!store.physicalCard(req.params.id)) {
    return res.status(404).json({ error: 'No such physical card' });
  }
  store.removePhysicalCard(req.params.id);
  res.json({ ok: true, cards: store.cards() });
});

/* -------------------------------------------------------- subscriptions */

app.get('/api/subscriptions', (_req, res) => {
  res.json({ subscriptions: store.subscriptions() });
});

app.post('/api/subscriptions', (req, res) => {
  const { name, price, billingCycle, description, startDate } = req.body ?? {};

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'price must be a positive number of cents' });
  }
  const cycle: BillingCycle = CYCLES.includes(billingCycle) ? billingCycle : 'Monthly';
  const start =
    typeof startDate === 'string' && startDate.length > 0
      ? startDate
      : new Date().toISOString().slice(0, 10);

  const sub = store.addSubscription({
    id: randomUUID(),
    name: name.trim(),
    price: Math.round(price),
    billingCycle: cycle,
    status: 'Active',
    description: typeof description === 'string' ? description : '',
    startDate: start,
    nextBillingDate: nextBillingDate(start, cycle),
    virtualCardId: null,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({ subscription: sub });
});

app.get('/api/subscriptions/:id', (req, res) => {
  const sub = store.subscription(req.params.id);
  if (!sub) return res.status(404).json({ error: 'No such subscription' });
  res.json({ subscription: sub });
});

app.delete('/api/subscriptions/:id', (req, res) => {
  const sub = store.subscription(req.params.id);
  if (!sub) return res.status(404).json({ error: 'No such subscription' });
  if (sub.virtualCardId) {
    store.updateCard(sub.virtualCardId, { linkedSubscriptionId: null, spendingLimit: null });
  }
  store.removeSubscription(sub.id);
  res.json({ ok: true });
});

/**
 * Bind a card to a subscription — the moment a generic card becomes a
 * merchant-specific credential. Pass cardId: null to unbind.
 */
app.post(
  '/api/subscriptions/:id/link',
  asyncRoute(async (req, res) => {
    const sub = store.subscription(req.params.id);
    if (!sub) return res.status(404).json({ error: 'No such subscription' });

    const cardId = req.body?.cardId ?? null;

    if (cardId === null) {
      if (sub.virtualCardId) {
        const current = store.card(sub.virtualCardId);
        if (current) await unlinkCard(current);
      }
      store.updateSubscription(sub.id, { virtualCardId: null });
      return res.json({
        subscription: store.subscription(sub.id),
        cards: store.cards(),
      });
    }

    const card = store.card(cardId);
    if (!card) return res.status(404).json({ error: 'No such card' });
    if (card.status === 'deleted') return res.status(410).json({ error: 'Card deleted' });

    await linkCard(card, sub);
    res.json({ subscription: store.subscription(sub.id), cards: store.cards() });
  }),
);

/** Charge the subscription against whatever card is bound to it. */
app.post(
  '/api/subscriptions/:id/charge',
  asyncRoute(async (req, res) => {
    const sub = store.subscription(req.params.id);
    if (!sub) return res.status(404).json({ error: 'No such subscription' });
    if (!sub.virtualCardId) {
      return res.status(400).json({ error: 'No Phantom card is linked to this subscription' });
    }
    const card = store.card(sub.virtualCardId);
    if (!card) return res.status(404).json({ error: 'The linked card no longer exists' });

    const amount = typeof req.body?.amount === 'number' ? Math.round(req.body.amount) : sub.price;

    const result = await charge(card, sub, amount, caps);
    res.json({ ...result, card: store.card(card.id), subscription: sub });
  }),
);

/**
 * Stripe real-time authorization webhook. Not reachable from a laptop without a tunnel,
 * but this is the production enforcement point for merchant locking — the same `evaluate`
 * the demo charge path uses.
 */
app.post(
  '/api/webhooks/issuing-authorization',
  asyncRoute(async (req, res) => {
    const event = req.body;
    if (event?.type !== 'issuing_authorization.request') return res.json({ received: true });

    const auth = event.data.object;
    const card = store.cardByStripeId(auth.card?.id);
    if (!card || !stripe) return res.json({ received: true });

    // The merchant on the wire has to be the subscription this card is bound to.
    const bound = card.linkedSubscriptionId ? store.subscription(card.linkedSubscriptionId) : null;
    const merchant = auth.merchant_data?.name ?? '';
    const matches = !!bound && bound.name.toLowerCase() === merchant.toLowerCase();

    const reason = matches
      ? evaluate(card, bound.id, auth.amount ?? 0)
      : `Locked to ${bound?.name ?? 'no subscription'} — ${merchant} is not authorised`;

    if (reason) {
      await stripe.issuing.authorizations.decline(auth.id, { metadata: { phantom_reason: reason } });
    } else {
      await stripe.issuing.authorizations.approve(auth.id);
    }
    res.json({ received: true });
  }),
);

/* --------------------------------------------------------------- alerts */

app.get('/api/alerts', (_req, res) => {
  res.json({ alerts: listAlerts() });
});

app.post('/api/alerts/:id/resolve', (req, res) => {
  const alert = listAlerts().find((a) => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'No such alert' });
  store.resolveAlert(alert.id, alert);
  res.json({ alerts: listAlerts() });
});

app.post('/api/reset', (_req, res) => {
  store.reset();
  res.json({ ok: true });
});

/**
 * In production the API also serves the built client, so the whole thing is one
 * deployable service on one port. In dev this is skipped — Vite serves the
 * client and proxies /api back here.
 */
const clientDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist');

if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // Anything that is not an API route is a client route: hand it the SPA shell.
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(resolve(clientDist, 'index.html'));
  });
  console.log(`  serving the client from ${clientDist}`);
} else {
  console.log('  no web/dist found — run `npm run build` in web/ to serve the client from here');
}

const port = Number(process.env.PORT ?? 4242);

probeCapabilities().then((probed) => {
  caps = probed;
  app.listen(port, () => {
    console.log(`\n  Phantom API on http://localhost:${port}`);
    console.log(`  mode: ${caps.mode}`);
    for (const note of caps.notes) console.log(`  - ${note}`);
    console.log('');
  });
});
