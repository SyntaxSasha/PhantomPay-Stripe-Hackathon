/**
 * Priority 1 from CLAUDE.md: find out what this Stripe account can actually do
 * before any UI depends on it. Creates nothing permanent except one cardholder
 * and one card, both in test mode.
 *
 *   npm run verify
 */
import 'dotenv/config';
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY?.trim();

const pass = (s: string) => console.log(`  PASS  ${s}`);
const fail = (s: string) => console.log(`  FAIL  ${s}`);
const info = (s: string) => console.log(`        ${s}`);

async function main() {
  console.log('\nPhantom — Stripe Issuing capability probe\n');

  if (!key) {
    fail('No STRIPE_SECRET_KEY in server/.env');
    info('Copy .env.example to .env and add a test-mode secret key.');
    process.exit(1);
  }
  if (!key.startsWith('sk_test_')) {
    fail('Key is not a test-mode key (expected sk_test_...)');
    process.exit(1);
  }
  pass('Test-mode secret key present');

  const stripe = new Stripe(key);

  try {
    const account = await stripe.accounts.retrieve();
    pass(`Account reachable: ${account.id}`);
    const issuingCap = (account.capabilities as Record<string, string> | undefined)?.card_issuing;
    info(`capabilities.card_issuing = ${issuingCap ?? 'not present on this account object'}`);
  } catch (err) {
    info(`Could not read the account object: ${(err as Error).message}`);
  }

  let cardholderId: string;
  try {
    const list = await stripe.issuing.cardholders.list({ limit: 1, status: 'active' });
    pass('Issuing API is enabled — cardholders are listable');
    if (list.data.length > 0) {
      cardholderId = list.data[0].id;
      info(`Reusing cardholder ${cardholderId}`);
    } else {
      const created = await stripe.issuing.cardholders.create({
        type: 'individual',
        name: 'Phantom Probe',
        email: 'probe@phantom.test',
        phone_number: '+15555550100',
        billing: {
          address: {
            line1: '510 Townsend St',
            city: 'San Francisco',
            state: 'CA',
            postal_code: '94103',
            country: 'US',
          },
        },
      });
      cardholderId = created.id;
      pass(`Created cardholder ${cardholderId}`);
    }
  } catch (err) {
    fail(`Issuing is NOT available: ${(err as Error).message}`);
    info('Enable Issuing at https://dashboard.stripe.com/test/issuing/overview');
    info('Until then the app runs in simulated mode and says so in the UI.');
    process.exit(1);
  }

  let cardId: string;
  try {
    const card = await stripe.issuing.cards.create({
      cardholder: cardholderId,
      currency: 'usd',
      type: 'virtual',
      status: 'active',
      spending_controls: { spending_limits: [{ amount: 2000, interval: 'monthly' }] },
      metadata: { phantom_probe: 'true' },
    });
    cardId = card.id;
    pass(`Virtual card created: ${card.id} (•••• ${card.last4}, exp ${card.exp_month}/${card.exp_year})`);
  } catch (err) {
    fail(`Cannot create virtual cards: ${(err as Error).message}`);
    process.exit(1);
  }

  try {
    const full = await stripe.issuing.cards.retrieve(cardId, { expand: ['number', 'cvc'] });
    if (full.number && full.cvc) {
      pass('PAN and CVC are readable via expand in test mode');
      info(`number ends ${full.number.slice(-4)}, cvc length ${full.cvc.length}`);
      info('Live mode would require ephemeral keys + a PCI-compliant client instead.');
    } else {
      fail('expand returned no number/cvc — the app must show labelled demo digits');
    }
  } catch (err) {
    fail(`Cannot reveal card details: ${(err as Error).message}`);
  }

  try {
    const auth = await stripe.testHelpers.issuing.authorizations.create({
      card: cardId,
      amount: 1499,
      currency: 'usd',
      merchant_data: { name: 'Netflix', category: 'digital_goods_media', country: 'US' },
    });
    pass(`Test authorization created: ${auth.id} status=${auth.status} approved=${auth.approved}`);
    if (auth.status === 'pending') {
      const captured = await stripe.testHelpers.issuing.authorizations.capture(auth.id);
      pass(`Captured: ${captured.id}`);
    }
  } catch (err) {
    fail(`Cannot drive test authorizations: ${(err as Error).message}`);
  }

  try {
    const over = await stripe.testHelpers.issuing.authorizations.create({
      card: cardId,
      amount: 500000,
      currency: 'usd',
      merchant_data: { name: 'Netflix', category: 'digital_goods_media', country: 'US' },
    });
    if (over.approved === false || over.status === 'closed') {
      pass('Spending limit is enforced by Stripe — $5,000 on a $20 card was declined');
      info(`reason: ${over.request_history?.[0]?.reason ?? 'unknown'}`);
    } else {
      fail(`A $5,000 authorization on a $20/month card was NOT declined (status=${over.status})`);
    }
  } catch (err) {
    info(`Over-limit probe: ${(err as Error).message}`);
  }

  console.log('\nCleaning up the probe card...');
  await stripe.issuing.cards.update(cardId, { status: 'canceled' });
  pass('Probe card cancelled');
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
